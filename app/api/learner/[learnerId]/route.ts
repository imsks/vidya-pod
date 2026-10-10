import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { checkLearnerAvailableForSponsorship } from "@/lib/sponsorship/validate-learner-available";

type RouteContext = {
  params: Promise<{ learnerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { learnerId } = await context.params;
    const prisma = getPrisma();

    const availability = await checkLearnerAvailableForSponsorship(prisma, learnerId);

    if (!availability.available) {
      const status = availability.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ error: availability.message }, { status });
    }

    const { learner } = availability;

    return NextResponse.json({
      success: true,
      data: {
        id: learner.id,
        name: learner.name,
        standard: learner.standard,
        image_url: learner.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching learner:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
