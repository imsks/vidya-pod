import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";
import { getReservationCutoff } from "./reservation";
import { isLearnerSponsored, type SponsorshipState } from "./availability";

export type LearnerUnavailableReason = "not_found" | "already_sponsored" | "pending_order";

export const LEARNER_UNAVAILABLE_MESSAGES: Record<LearnerUnavailableReason, string> = {
  not_found: "Learner not found",
  already_sponsored: "This learner is already sponsored",
  pending_order:
    "Someone is checking out for this learner right now. Please try again in a minute.",
};

export type LearnerAvailabilityResult =
  | {
      available: true;
      learner: { id: string; name: string; standard: string; imageUrl: string | null };
    }
  | {
      available: false;
      reason: LearnerUnavailableReason;
      message: string;
    };

export type LearnerAvailabilityStatus =
  | { available: true }
  | { available: false; reason: Exclude<LearnerUnavailableReason, "not_found">; message: string };

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
      message: LEARNER_UNAVAILABLE_MESSAGES.not_found,
    };
  }

  if (isLearnerSponsored(learner)) {
    return {
      available: false,
      reason: "already_sponsored",
      message: LEARNER_UNAVAILABLE_MESSAGES.already_sponsored,
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
      message: LEARNER_UNAVAILABLE_MESSAGES.pending_order,
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

/**
 * Availability for many already-loaded learners with a single reservation lookup, so a cart
 * can report every learner that became unavailable instead of failing on the first one.
 */
export const getLearnersAvailability = async (
  prisma: PrismaClient,
  learners: Array<{ id: string } & SponsorshipState>,
  now: Date = new Date(),
): Promise<Map<string, LearnerAvailabilityStatus>> => {
  const availability = new Map<string, LearnerAvailabilityStatus>();
  const unsponsoredIds: string[] = [];

  for (const learner of learners) {
    if (isLearnerSponsored(learner, now)) {
      availability.set(learner.id, {
        available: false,
        reason: "already_sponsored",
        message: LEARNER_UNAVAILABLE_MESSAGES.already_sponsored,
      });
    } else {
      unsponsoredIds.push(learner.id);
    }
  }

  if (unsponsoredIds.length === 0) {
    return availability;
  }

  const reservations = await prisma.sponsorOrder.findMany({
    where: {
      learnerId: { in: unsponsoredIds },
      status: SponsorOrderStatus.PENDING,
      createdAt: { gte: getReservationCutoff(now) },
    },
    select: { learnerId: true },
  });
  const reservedIds = new Set(reservations.map((reservation) => reservation.learnerId));

  for (const learnerId of unsponsoredIds) {
    availability.set(
      learnerId,
      reservedIds.has(learnerId)
        ? {
            available: false,
            reason: "pending_order",
            message: LEARNER_UNAVAILABLE_MESSAGES.pending_order,
          }
        : { available: true },
    );
  }

  return availability;
};
