import type { Prisma } from "@/generated/prisma";

/**
 * A learner is adopted while they have a sponsor and the paid period has not elapsed.
 * A null end date means the sponsorship never lapses.
 * `availableLearnerWhere` and `sponsoredLearnerWhere` are exact complements.
 */

export type SponsorshipState = {
  sponsorId: string | null;
  sponsorshipEndsAt: Date | null;
};

export const isLearnerSponsored = (learner: SponsorshipState, now: Date = new Date()): boolean =>
  learner.sponsorId !== null &&
  (learner.sponsorshipEndsAt === null || learner.sponsorshipEndsAt.getTime() >= now.getTime());

export const sponsoredLearnerWhere = (now: Date = new Date()): Prisma.LearnerWhereInput => ({
  sponsorId: { not: null },
  OR: [{ sponsorshipEndsAt: null }, { sponsorshipEndsAt: { gte: now } }],
});

export const availableLearnerWhere = (now: Date = new Date()): Prisma.LearnerWhereInput => ({
  OR: [{ sponsorId: null }, { sponsorshipEndsAt: { lt: now } }],
});
