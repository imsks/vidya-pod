import { NextResponse, type NextRequest } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { isPhotoUploadError, isPhotoValidationError, uploadEntityPhoto } from "@/lib/storage";
import { validateAdminSecret } from "@/lib/admin-auth";
import { parseLearnerBody } from "@/lib/validation/learner";
import {
  availableLearnerWhere,
  isLearnerSponsored,
  sponsoredLearnerWhere,
} from "@/lib/sponsorship/availability";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

const STATUS_FILTERS = {
  all: () => ({}),
  sponsored: sponsoredLearnerWhere,
  available: availableLearnerWhere,
} as const;

type StatusFilter = keyof typeof STATUS_FILTERS;

const isStatusFilter = (value: string): value is StatusFilter => value in STATUS_FILTERS;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = parseInt(value ?? String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : Math.max(1, parsed);
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedStatus = searchParams.get("status") ?? "all";

    if (!isStatusFilter(requestedStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${Object.keys(STATUS_FILTERS).join(", ")}` },
        { status: 400 },
      );
    }

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MAX_LIMIT);
    const now = new Date();
    const where = STATUS_FILTERS[requestedStatus](now);

    const prisma = getPrisma();
    const [learners, totalCount, sponsoredCount, availableCount] = await Promise.all([
      prisma.learner.findMany({
        where,
        select: {
          id: true,
          name: true,
          standard: true,
          imageUrl: true,
          sponsorId: true,
          sponsorshipEndsAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.learner.count({ where }),
      prisma.learner.count({ where: sponsoredLearnerWhere(now) }),
      prisma.learner.count({ where: availableLearnerWhere(now) }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: learners.map((learner) => ({
        id: learner.id,
        name: learner.name,
        standard: learner.standard,
        image_url: learner.imageUrl,
        is_sponsored: isLearnerSponsored(learner, now),
        sponsorship_ends_at: learner.sponsorshipEndsAt?.toISOString() ?? null,
        created_at: learner.createdAt.toISOString(),
      })),
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
    console.error("Error listing learners:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
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
        phone: phone?.trim() || null,
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
        phone: string | null;
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
