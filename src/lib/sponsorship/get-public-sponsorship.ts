import type { PrismaClient } from "@/generated/prisma";
import { isValidShareSlug } from "./share-url";

export type PublicSponsorship = {
  sponsorName: string;
  plan: string;
  sponsoredAt: Date;
  learner: {
    name: string;
    standard: string;
    imageUrl: string | null;
  } | null;
};

/** Fetches the publicly shareable details of a completed sponsorship by its share slug. */
export const getPublicSponsorship = async (
  prisma: PrismaClient,
  slug: string,
): Promise<PublicSponsorship | null> => {
  if (!isValidShareSlug(slug)) {
    return null;
  }

  const order = await prisma.sponsorOrder.findUnique({
    where: { shareSlug: slug },
    select: {
      name: true,
      plan: true,
      status: true,
      createdAt: true,
      sponsor: { select: { name: true } },
      learner: { select: { name: true, standard: true, imageUrl: true } },
    },
  });

  if (!order || order.status !== "SUCCESS") {
    return null;
  }

  return {
    sponsorName: order.sponsor?.name ?? order.name,
    plan: order.plan,
    sponsoredAt: order.createdAt,
    learner: order.learner
      ? {
          name: order.learner.name,
          standard: order.learner.standard,
          imageUrl: order.learner.imageUrl,
        }
      : null,
  };
};
