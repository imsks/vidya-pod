import { NextResponse } from "next/server";
import type { Proctor, Student, Teacher } from "@/generated/prisma";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import type { StorageEntityType } from "@/lib/storage/constants";
import { parseRegisterBody } from "@/lib/validation/register";

const roleToStorageEntity: Record<"teacher" | "student" | "proctor", StorageEntityType> = {
  teacher: "teacher",
  student: "student",
  proctor: "proctor",
};

const mapTeacher = (teacher: Teacher) => ({
  id: teacher.id,
  name: teacher.name,
  phone: teacher.phone,
  qualification: teacher.qualification,
  image_url: teacher.imageUrl,
  created_at: teacher.createdAt.toISOString(),
});

const mapStudent = (student: Student) => ({
  id: student.id,
  name: student.name,
  phone: student.phone,
  standard: student.standard,
  image_url: student.imageUrl,
  created_at: student.createdAt.toISOString(),
});

const mapProctor = (proctor: Proctor) => ({
  id: proctor.id,
  name: proctor.name,
  phone: proctor.phone,
  qualification: proctor.qualification,
  image_url: proctor.imageUrl,
  created_at: proctor.createdAt.toISOString(),
});

export async function POST(request: Request) {
  try {
    const adminSecret = getAdminSecretFromRequest(request);
    if (!validateAdminSecret(adminSecret)) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 });
    }

    const body = await request.json();
    const { photo_data, photo_filename, ...registerData } = body;
    const parsed = parseRegisterBody(registerData);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { role, name, phone, image_url } = parsed.data;
    let finalImageUrl: string | null = image_url || null;
    let photoUploadWarning: string | undefined;

    if (photo_data && photo_filename) {
      try {
        finalImageUrl = await uploadEntityPhoto({
          entityType: roleToStorageEntity[role],
          base64Data: photo_data,
          filename: photo_filename,
        });
      } catch (error) {
        if (isPhotoUploadError(error) && isPhotoValidationError(error)) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (isPhotoUploadError(error)) {
          photoUploadWarning = error.message;
        } else {
          photoUploadWarning = "Photo upload failed. Record was created without an image.";
        }
      }
    }

    const prisma = getPrisma();
    let entity: Teacher | Student | Proctor;

    if (role === "student") {
      entity = await prisma.student.create({
        data: {
          name,
          phone,
          standard: parsed.data.standard,
          imageUrl: finalImageUrl,
        },
      });
    } else if (role === "teacher") {
      entity = await prisma.teacher.create({
        data: {
          name,
          phone,
          qualification: parsed.data.qualification,
          imageUrl: finalImageUrl,
        },
      });
    } else {
      entity = await prisma.proctor.create({
        data: {
          name,
          phone,
          qualification: parsed.data.qualification,
          imageUrl: finalImageUrl,
        },
      });
    }

    const response: {
      success: boolean;
      entity: ReturnType<typeof mapTeacher | typeof mapStudent | typeof mapProctor>;
      warning?: string;
    } = {
      success: true,
      entity:
        role === "student"
          ? mapStudent(entity as Student)
          : role === "teacher"
            ? mapTeacher(entity as Teacher)
            : mapProctor(entity as Proctor),
    };

    if (photoUploadWarning) {
      response.warning = photoUploadWarning;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in register route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
