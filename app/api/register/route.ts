import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { mapProctor, mapTeacher } from "@/lib/admin/record-mappers";
import { internalError, jsonError } from "@/lib/api/respond";
import { createProctor, createTeacher } from "@/lib/data/staff";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import type { StorageEntityType } from "@/lib/storage/constants";
import { parseRegisterBody } from "@/lib/validation/register";

const roleToStorageEntity: Record<"teacher" | "proctor", StorageEntityType> = {
  teacher: "teacher",
  proctor: "proctor",
};

export async function POST(request: Request) {
  try {
    const adminSecret = getAdminSecretFromRequest(request);
    if (!validateAdminSecret(adminSecret)) {
      return jsonError("Unauthorized: Invalid admin PIN", 401);
    }

    const body = await request.json();
    const { photo_data, photo_filename, ...registerData } = body;
    const parsed = parseRegisterBody(registerData);

    if (!parsed.success) {
      return jsonError(parsed.error, parsed.status);
    }

    const { role, name, phone, image_url, qualification } = parsed.data;
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
          return jsonError(error.message, 400);
        }

        if (isPhotoUploadError(error)) {
          photoUploadWarning = error.message;
        } else {
          photoUploadWarning = "Photo upload failed. Record was created without an image.";
        }
      }
    }

    const prisma = getPrisma();
    const data = { name, phone, qualification, imageUrl: finalImageUrl };
    const entity =
      role === "teacher"
        ? mapTeacher(await createTeacher(prisma, data))
        : mapProctor(await createProctor(prisma, data));

    return NextResponse.json({
      success: true,
      entity,
      ...(photoUploadWarning ? { warning: photoUploadWarning } : {}),
    });
  } catch (error) {
    return internalError(error, "Error in register route");
  }
}
