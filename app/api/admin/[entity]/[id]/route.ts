import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { mapLearner, mapProctor, mapTeacher } from "@/lib/admin/record-mappers";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import {
  isAdminEditableEntity,
  parseAdminEntityUpdateBody,
  type AdminEditableEntity,
} from "@/lib/validation/admin-entity-update";

type RouteContext = {
  params: Promise<{ entity: string; id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolvedRoute =
  { ok: true; entity: AdminEditableEntity; id: string } | { ok: false; response: NextResponse };

const resolveRoute = async (request: Request, context: RouteContext): Promise<ResolvedRoute> => {
  if (!validateAdminSecret(getAdminSecretFromRequest(request))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 }),
    };
  }

  const { entity, id } = await context.params;

  if (!isAdminEditableEntity(entity)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unsupported entity" }, { status: 404 }),
    };
  }

  if (!UUID_PATTERN.test(id)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid id" }, { status: 400 }),
    };
  }

  return { ok: true, entity, id };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const route = await resolveRoute(request, context);
    if (!route.ok) {
      return route.response;
    }

    const { entity, id } = route;
    const body = await request.json();
    const { photo_data: photoData, photo_filename: photoFilename, ...entityData } = body ?? {};
    const parsed = parseAdminEntityUpdateBody(entity, entityData);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    // An explicit image_url wins; a newly picked file is only uploaded when no URL was given.
    let imageUrl: string | null = parsed.data.image_url?.trim() || null;
    let photoUploadWarning: string | undefined;

    if (!imageUrl && photoData && photoFilename) {
      try {
        imageUrl = await uploadEntityPhoto({
          entityType: entity,
          base64Data: photoData,
          filename: photoFilename,
        });
      } catch (error) {
        if (isPhotoUploadError(error) && isPhotoValidationError(error)) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        photoUploadWarning = isPhotoUploadError(error)
          ? error.message
          : "Photo upload failed. Other details were still saved.";
      }
    }

    const prisma = getPrisma();

    if (parsed.entity === "learner") {
      const existing = await prisma.learner.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        return NextResponse.json({ error: "Learner not found" }, { status: 404 });
      }

      const learner = await prisma.learner.update({
        where: { id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone?.trim() || null,
          standard: parsed.data.standard,
          imageUrl,
        },
      });

      return NextResponse.json({
        success: true,
        record: mapLearner(learner),
        ...(photoUploadWarning ? { warning: photoUploadWarning } : {}),
      });
    }

    const data = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      qualification: parsed.data.qualification,
      imageUrl,
    };

    if (parsed.entity === "teacher") {
      const existing = await prisma.teacher.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }

      const teacher = await prisma.teacher.update({ where: { id }, data });

      return NextResponse.json({
        success: true,
        record: mapTeacher(teacher),
        ...(photoUploadWarning ? { warning: photoUploadWarning } : {}),
      });
    }

    const existing = await prisma.proctor.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Proctor not found" }, { status: 404 });
    }

    const proctor = await prisma.proctor.update({ where: { id }, data });

    return NextResponse.json({
      success: true,
      record: mapProctor(proctor),
      ...(photoUploadWarning ? { warning: photoUploadWarning } : {}),
    });
  } catch (error) {
    console.error("Error updating admin entity:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const route = await resolveRoute(request, context);
    if (!route.ok) {
      return route.response;
    }

    const { entity, id } = route;
    const prisma = getPrisma();

    if (entity === "learner") {
      const learner = await prisma.learner.findUnique({
        where: { id },
        select: { sponsorId: true },
      });

      if (!learner) {
        return NextResponse.json({ error: "Learner not found" }, { status: 404 });
      }

      // Removing a sponsored learner would orphan a paid sponsorship.
      if (learner.sponsorId) {
        return NextResponse.json(
          { error: "This learner is sponsored and cannot be deleted." },
          { status: 409 },
        );
      }

      await prisma.learner.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (entity === "teacher") {
      const teacher = await prisma.teacher.findUnique({ where: { id }, select: { id: true } });
      if (!teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }

      await prisma.teacher.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    const proctor = await prisma.proctor.findUnique({ where: { id }, select: { id: true } });
    if (!proctor) {
      return NextResponse.json({ error: "Proctor not found" }, { status: 404 });
    }

    await prisma.proctor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin entity:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
