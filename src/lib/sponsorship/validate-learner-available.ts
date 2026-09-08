import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";

export type LearnerAvailabilityResult =
  | { available: true; learner: { id: string; name: string; standard: string; imageUrl: string | null } }
  | { available: false; reason: "not_found" | "already_sponsored" | "pending_order"; message: string };

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
    },
  });

  if (!learner) {
    return {
      available: false,
      reason: "not_found",
      message: "Learner not found",
    };
  }

  if (learner.sponsorId !== null) {
    return {
      available: false,
      reason: "already_sponsored",
      message: "This learner is already sponsored",
    };
  }

  const pendingOrder = await prisma.sponsorOrder.findFirst({
    where: {
      learnerId,
      status: SponsorOrderStatus.PENDING,
    },
    select: { id: true },
  });

  if (pendingOrder) {
    return {
      available: false,
      reason: "pending_order",
      message: "This learner already has a sponsorship in progress",
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
