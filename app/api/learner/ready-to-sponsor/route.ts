import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10));
    const requestedLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

    const skip = (page - 1) * limit;

    const prisma = getPrisma();

    // Query learners ready to be sponsored (no sponsor assigned)
    const [learners, totalCount] = await Promise.all([
      prisma.learner.findMany({
        where: {
          sponsorId: null,
        },
        select: {
          id: true,
          name: true,
          standard: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.learner.count({
        where: {
          sponsorId: null,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: learners.map((learner) => ({
        id: learner.id,
        name: learner.name,
        standard: learner.standard,
        image_url: learner.imageUrl,
        created_at: learner.createdAt.toISOString(),
      })),
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
    console.error("Error fetching learners ready to sponsor:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
