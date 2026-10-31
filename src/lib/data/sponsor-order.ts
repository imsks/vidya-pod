import "server-only";

import { SponsorOrderStatus, type PrismaClient, type SponsorOrder } from "@/generated/prisma";

/** Donor email is deliberately excluded — this feeds an unauthenticated endpoint. */
const orderStatusSelect = {
  orderId: true,
  status: true,
  plan: true,
  amount: true,
  learner: {
    select: {
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

export type SponsorOrderStatusRecord = NonNullable<
  Awaited<ReturnType<typeof getSponsorOrderForStatus>>
>;

export const getSponsorOrderForStatus = (prisma: PrismaClient, orderId: string) =>
  prisma.sponsorOrder.findUnique({ where: { orderId }, select: orderStatusSelect });

export const attachPaymentSession = (
  prisma: PrismaClient,
  id: string,
  paymentSessionId: string,
): Promise<SponsorOrder> =>
  prisma.sponsorOrder.update({ where: { id }, data: { paymentSessionId } });

export const markSponsorOrderFailed = (prisma: PrismaClient, id: string): Promise<SponsorOrder> =>
  prisma.sponsorOrder.update({ where: { id }, data: { status: SponsorOrderStatus.FAILED } });
