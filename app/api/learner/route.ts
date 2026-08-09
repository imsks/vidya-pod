import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getSupabase } from "@/lib/supabase";
import { parseLearnerBody } from "@/lib/validation/learner";

// TODO: Remove this PIN-based authentication once RBAC is enabled.
// This is a temporary solution for admin-only access to the learner upload endpoint.
const validateAdminSecret = (secret: string | null): boolean => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.warn("ADMIN_SECRET environment variable is not set");
    return false;
  }
  return secret === adminSecret;
};

/**
 * Uploads a photo to Supabase Storage and returns the public URL.
 * @param base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param filename - Original filename or a generated name
 * @returns The public URL of the uploaded image, or null if upload fails
 */
async function uploadPhotoToStorage(base64Data: string, filename: string): Promise<string | null> {
  try {
    const supabase = getSupabase();

    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

    // Decode base64 to binary
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine content type from filename or default to jpeg
    const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
    const contentType =
      extension === "png"
        ? "image/png"
        : extension === "gif"
          ? "image/gif"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";

    // Generate a unique filename
    const uniqueFilename = `learners/${Date.now()}-${filename}`;

    const { data, error } = await supabase.storage.from("photos").upload(uniqueFilename, bytes, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("Error uploading photo to storage:", error);
      return null;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Error processing photo upload:", error);
    return null;
  }
}

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
      const uploadedUrl = await uploadPhotoToStorage(photo_data, photo_filename);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        // Photo upload failed - continue but include warning in response
        photoUploadWarning = "Photo upload failed. Learner was created without an image.";
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
