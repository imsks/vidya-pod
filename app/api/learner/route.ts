import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import { validateAdminSecret } from "@/lib/admin-auth";
import { parseLearnerBody } from "@/lib/validation/learner";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();

    // TODO: Remove this PIN-based authentication once RBAC is enabled.
    // Validate admin secret
    const { admin_secret, photo_data, photo_filename, ...learnerData } = body;

    if (!validateAdminSecret(admin_secret)) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 });
    }

    // Validate learner data
    const parsed = parseLearnerBody(learnerData);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { name, phone, standard, image_url, sponsor_id } = parsed.data;

    // Handle photo upload if provided
    let finalImageUrl: string | null = image_url || null;
    let photoUploadWarning: string | undefined;

    if (photo_data && photo_filename) {
      try {
        finalImageUrl = await uploadEntityPhoto({
          entityType: "learner",
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
          photoUploadWarning = "Photo upload failed. Learner was created without an image.";
        }
      }
    }

    // Store learner in database
    const prisma = getPrisma();
    const learner = await prisma.learner.create({
      data: {
        name,
        phone,
        standard,
        imageUrl: finalImageUrl,
        sponsorId: sponsor_id || null,
      },
    });

    const response: {
      success: boolean;
      learner: {
        id: string;
        name: string;
        phone: string;
        standard: string;
        image_url: string | null;
        sponsor_id: string | null;
        created_at: string;
      };
      warning?: string;
    } = {
      success: true,
      learner: {
        id: learner.id,
        name: learner.name,
        phone: learner.phone,
        standard: learner.standard,
        image_url: learner.imageUrl,
        sponsor_id: learner.sponsorId,
        created_at: learner.createdAt.toISOString(),
      },
    };

    if (photoUploadWarning) {
      response.warning = photoUploadWarning;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in learner upload route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
