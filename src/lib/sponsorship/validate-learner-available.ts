import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";
import { getReservationCutoff } from "./reservation";
import { isLearnerSponsored } from "./availability";

export type LearnerAvailabilityResult =
  | {
      available: true;
      learner: { id: string; name: string; standard: string; imageUrl: string | null };
    }
  | {
      available: false;
      reason: "not_found" | "already_sponsored" | "pending_order";
      message: string;
    };

export const checkLearnerAvailableForSponsorship = async (
  prisma: PrismaClient,
  learnerId: string,
): Promise<LearnerAvailabilityResult> => {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: {
      id: true,
      name: true,
      standard: true,
      imageUrl: true,
      sponsorId: true,
      sponsorshipEndsAt: true,
    },
  });

  if (!learner) {
    return {
      available: false,
      reason: "not_found",
      message: "Learner not found",
    };
  }

  if (isLearnerSponsored(learner)) {
    return {
      available: false,
      reason: "already_sponsored",
      message: "This learner is already sponsored",
    };
  }

  const activeReservation = await prisma.sponsorOrder.findFirst({
    where: {
      learnerId,
      status: SponsorOrderStatus.PENDING,
      createdAt: { gte: getReservationCutoff() },
    },
    select: { id: true },
  });

  if (activeReservation) {
    return {
      available: false,
      reason: "pending_order",
      message: "Someone is checking out for this learner right now. Please try again in a minute.",
    };
  }

  return {
    available: true,
    learner: {
      id: learner.id,
      name: learner.name,
      standard: learner.standard,
      imageUrl: learner.imageUrl,
    },
  };
};
