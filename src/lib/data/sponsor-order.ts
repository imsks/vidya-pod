import "server-only";

import { SponsorOrderStatus, type PrismaClient } from "@/generated/prisma";

/** Donor email is deliberately excluded — this feeds an unauthenticated endpoint. */
const orderStatusSelect = {
  status: true,
  plan: true,
  amount: true,
  learner: {
    select: {
      id: true,
      name: true,
      standard: true,
      sponsorshipEndsAt: true,
    },
  },
  sponsor: {
    select: {
      name: true,
    },
  },
} as const;

export const getSponsorOrdersForStatus = (prisma: PrismaClient, paymentOrderId: string) =>
  prisma.sponsorOrder.findMany({
    where: { paymentOrderId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: orderStatusSelect,
  });

export const attachPaymentSession = (
  prisma: PrismaClient,
  paymentOrderId: string,
  paymentSessionId: string,
) => prisma.sponsorOrder.updateMany({ where: { paymentOrderId }, data: { paymentSessionId } });

/** Frees every learner held by a payment that will never be completed. */
export const markPaymentOrderFailed = (prisma: PrismaClient, paymentOrderId: string) =>
  prisma.sponsorOrder.updateMany({
    where: { paymentOrderId, status: SponsorOrderStatus.PENDING },
    data: { status: SponsorOrderStatus.FAILED },
  });
