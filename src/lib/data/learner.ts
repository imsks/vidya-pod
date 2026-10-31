import "server-only";

import type { Learner, PrismaClient } from "@/generated/prisma";
import { availableLearnerWhere, sponsoredLearnerWhere } from "@/lib/sponsorship/availability";

const STATUS_FILTERS = {
  all: () => ({}),
  sponsored: sponsoredLearnerWhere,
  available: availableLearnerWhere,
} as const;

export type LearnerStatusFilter = keyof typeof STATUS_FILTERS;

export const LEARNER_STATUS_FILTERS = Object.keys(STATUS_FILTERS) as LearnerStatusFilter[];

export const isLearnerStatusFilter = (value: string): value is LearnerStatusFilter =>
  value in STATUS_FILTERS;

export type ListLearnersArgs = {
  status: LearnerStatusFilter;
  page: number;
  limit: number;
  now?: Date;
};

export const listLearners = async (
  prisma: PrismaClient,
  { status, page, limit, now = new Date() }: ListLearnersArgs,
) => {
  const where = STATUS_FILTERS[status](now);

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

  return { learners, totalCount, sponsoredCount, availableCount, now };
};

export type CreateLearnerInput = {
  name: string;
  phone: string | null;
  standard: string;
  imageUrl: string | null;
  sponsorId: string | null;
};

export const createLearner = (prisma: PrismaClient, input: CreateLearnerInput): Promise<Learner> =>
  prisma.learner.create({ data: input });
