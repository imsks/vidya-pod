import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { mapLearner, mapProctor, mapTeacher } from "@/lib/admin/record-mappers";
import { internalError, jsonError } from "@/lib/api/respond";
import {
  deleteLearnerRecord,
  deleteProctorRecord,
  deleteTeacherRecord,
  updateLearnerRecord,
  updateProctorRecord,
  updateTeacherRecord,
} from "@/lib/data/admin-entity";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import { fromIstDateInput } from "@/lib/sponsorship/period";
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
    return { ok: false, response: jsonError("Unauthorized: Invalid admin PIN", 401) };
  }

  const { entity, id } = await context.params;

  if (!isAdminEditableEntity(entity)) {
    return { ok: false, response: jsonError("Unsupported entity", 404) };
  }

  if (!UUID_PATTERN.test(id)) {
    return { ok: false, response: jsonError("Invalid id", 400) };
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
      return jsonError(parsed.error, parsed.status);
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
          return jsonError(error.message, 400);
        }

        photoUploadWarning = isPhotoUploadError(error)
          ? error.message
          : "Photo upload failed. Other details were still saved.";
      }
    }

    const prisma = getPrisma();
    const warning = photoUploadWarning ? { warning: photoUploadWarning } : {};

    if (parsed.entity === "learner") {
      const sponsorshipEndsAt = parsed.data.sponsorship_ends_at
        ? fromIstDateInput(parsed.data.sponsorship_ends_at)
        : null;

      if (parsed.data.sponsorship_ends_at && !sponsorshipEndsAt) {
        return jsonError("Invalid sponsorship end date", 400);
      }

      const learner = await updateLearnerRecord(prisma, id, {
        name: parsed.data.name,
        phone: parsed.data.phone?.trim() || null,
        standard: parsed.data.standard,
        imageUrl,
        sponsorshipEndsAt,
      });

      if (!learner) {
        return jsonError("Learner not found", 404);
      }

      return NextResponse.json({ success: true, record: mapLearner(learner), ...warning });
    }

    const data = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      qualification: parsed.data.qualification,
      imageUrl,
    };

    if (parsed.entity === "teacher") {
      const teacher = await updateTeacherRecord(prisma, id, data);

      if (!teacher) {
        return jsonError("Teacher not found", 404);
      }

      return NextResponse.json({ success: true, record: mapTeacher(teacher), ...warning });
    }

    const proctor = await updateProctorRecord(prisma, id, data);

    if (!proctor) {
      return jsonError("Proctor not found", 404);
    }

    return NextResponse.json({ success: true, record: mapProctor(proctor), ...warning });
  } catch (error) {
    return internalError(error, "Error updating admin entity");
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
      const result = await deleteLearnerRecord(prisma, id);

      if (result === "not_found") {
        return jsonError("Learner not found", 404);
      }

      if (result === "sponsored") {
        return jsonError("This learner is sponsored and cannot be deleted.", 409);
      }

      return NextResponse.json({ success: true });
    }

    if (entity === "teacher") {
      if (!(await deleteTeacherRecord(prisma, id))) {
        return jsonError("Teacher not found", 404);
      }

      return NextResponse.json({ success: true });
    }

    if (!(await deleteProctorRecord(prisma, id))) {
      return jsonError("Proctor not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError(error, "Error deleting admin entity");
  }
}
