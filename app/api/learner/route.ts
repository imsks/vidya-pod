import { NextResponse, type NextRequest } from "next/server";
import { validateAdminSecret } from "@/lib/admin-auth";
import { mapLearner, mapPublicLearner } from "@/lib/admin/record-mappers";
import { internalError, jsonError } from "@/lib/api/respond";
import {
  createLearner,
  isLearnerStatusFilter,
  LEARNER_STATUS_FILTERS,
  listLearners,
} from "@/lib/data/learner";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import { parseLearnerBody } from "@/lib/validation/learner";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = parseInt(value ?? String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : Math.max(1, parsed);
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedStatus = searchParams.get("status") ?? "all";

    if (!isLearnerStatusFilter(requestedStatus)) {
      return jsonError(`status must be one of: ${LEARNER_STATUS_FILTERS.join(", ")}`, 400);
    }

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);

    const { learners, totalCount, sponsoredCount, availableCount, now } = await listLearners(
      getPrisma(),
      { status: requestedStatus, page, limit },
    );

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: learners.map((learner) => mapPublicLearner(learner, now)),
      counts: {
        all: sponsoredCount + availableCount,
        sponsored: sponsoredCount,
        available: availableCount,
      },
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
    });
  } catch (error) {
    return internalError(error, "Error listing learners");
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
      return jsonError("Unauthorized: Invalid admin PIN", 401);
    }

    // Validate learner data
    const parsed = parseLearnerBody(learnerData);

    if (!parsed.success) {
      return jsonError(parsed.error, parsed.status);
    }

    const { name, phone, standard, image_url, sponsor_id } = parsed.data;

    // An image_url is stored as-is; only uploaded files go through storage.
    let finalImageUrl: string | null = image_url?.trim() || null;
    let photoUploadWarning: string | undefined;

    if (!finalImageUrl && photo_data && photo_filename) {
      try {
        finalImageUrl = await uploadEntityPhoto({
          entityType: "learner",
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
          photoUploadWarning = "Photo upload failed. Learner was created without an image.";
        }
      }
    }

    const learner = await createLearner(getPrisma(), {
      name,
      phone: phone?.trim() || null,
      standard,
      imageUrl: finalImageUrl,
      sponsorId: sponsor_id || null,
    });

    return NextResponse.json({
      success: true,
      learner: mapLearner(learner),
      ...(photoUploadWarning ? { warning: photoUploadWarning } : {}),
    });
  } catch (error) {
    return internalError(error, "Error in learner upload route");
  }
}
