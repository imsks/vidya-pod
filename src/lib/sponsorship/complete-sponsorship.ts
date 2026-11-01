import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";
import { generateShareSlug } from "./share-url";
import { isLearnerSponsored } from "./availability";
import { sponsorshipEndFor } from "./period";

export type CompleteSponsorshipResult =
  | { success: true; status: SponsorOrderStatus; alreadyCompleted: boolean }
  | { success: false; reason: "order_not_found" | "invalid_status" };

// An expired reservation can still be settled if the sponsor's payment lands late.
const UNSETTLED_STATUSES: SponsorOrderStatus[] = [
  SponsorOrderStatus.PENDING,
  SponsorOrderStatus.EXPIRED,
];

/** Settles every learner row paid for by one Cashfree order under a single sponsor. */
export const completeSponsorshipPayment = async (
  prisma: PrismaClient,
  paymentOrderId: string,
): Promise<CompleteSponsorshipResult> => {
  const orders = await prisma.sponsorOrder.findMany({
    where: { paymentOrderId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (orders.length === 0) {
    return { success: false, reason: "order_not_found" };
  }

  const unsettled = orders.filter((order) => UNSETTLED_STATUSES.includes(order.status));

  if (unsettled.length === 0) {
    return orders.some((order) => order.status === SponsorOrderStatus.SUCCESS)
      ? { success: true, status: SponsorOrderStatus.SUCCESS, alreadyCompleted: true }
      : { success: false, reason: "invalid_status" };
  }

  const [donor] = unsettled;

  await prisma.$transaction(async (tx) => {
    const paidAt = new Date();
    let sponsor = await tx.sponsor.findFirst({
      where: { email: donor.email },
    });

    if (!sponsor) {
      sponsor = await tx.sponsor.create({
        data: {
          name: donor.name,
          email: donor.email,
          phone: donor.phone,
          showPublicly: donor.publicAcknowledgementOptIn,
        },
      });
    } else {
      sponsor = await tx.sponsor.update({
        where: { id: sponsor.id },
        data: { showPublicly: donor.publicAcknowledgementOptIn },
      });
    }

    for (const order of unsettled) {
      await tx.sponsorOrder.update({
        where: { id: order.id },
        data: {
          status: SponsorOrderStatus.SUCCESS,
          sponsorId: sponsor.id,
          shareSlug: order.shareSlug ?? generateShareSlug(),
        },
      });

      if (!order.learnerId) {
        continue;
      }

      const learner = await tx.learner.findUnique({
        where: { id: order.learnerId },
        select: { sponsorId: true, sponsorshipEndsAt: true },
      });

      // A lapsed learner is reassigned; an active sponsorship is never overwritten.
      if (learner && !isLearnerSponsored(learner, paidAt)) {
        await tx.learner.update({
          where: { id: order.learnerId },
          data: {
            sponsorId: sponsor.id,
            sponsorshipEndsAt: sponsorshipEndFor(order.plan, paidAt),
          },
        });
      }
    }
  });

  return { success: true, status: SponsorOrderStatus.SUCCESS, alreadyCompleted: false };
};

/** Releases every learner of a failed payment. A captured payment is never overridden. */
export const failSponsorshipPayment = async (
  prisma: PrismaClient,
  paymentOrderId: string,
): Promise<CompleteSponsorshipResult> => {
  const orders = await prisma.sponsorOrder.findMany({
    where: { paymentOrderId },
    select: { status: true },
  });

  if (orders.length === 0) {
    return { success: false, reason: "order_not_found" };
  }

  if (orders.some((order) => order.status === SponsorOrderStatus.SUCCESS)) {
    return { success: true, status: SponsorOrderStatus.SUCCESS, alreadyCompleted: true };
  }

  const { count } = await prisma.sponsorOrder.updateMany({
    where: { paymentOrderId, status: { in: UNSETTLED_STATUSES } },
    data: { status: SponsorOrderStatus.FAILED },
  });

  return { success: true, status: SponsorOrderStatus.FAILED, alreadyCompleted: count === 0 };
};

export type CashfreeWebhookPayload = {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
    };
    payment?: {
      payment_status?: string;
    };
  };
};

export const getOrderIdFromWebhookPayload = (payload: CashfreeWebhookPayload): string | null => {
  return payload.data?.order?.order_id ?? null;
};

export const isPaymentSuccessWebhook = (payload: CashfreeWebhookPayload): boolean => {
  const type = payload.type?.toUpperCase() ?? "";
  const paymentStatus = payload.data?.payment?.payment_status?.toUpperCase() ?? "";

  if (type.includes("PAYMENT_SUCCESS") || paymentStatus === "SUCCESS") {
    return true;
  }

  return false;
};

export const isPaymentFailedWebhook = (payload: CashfreeWebhookPayload): boolean => {
  const type = payload.type?.toUpperCase() ?? "";
  const paymentStatus = payload.data?.payment?.payment_status?.toUpperCase() ?? "";

  if (type.includes("PAYMENT_FAILED") || paymentStatus === "FAILED") {
    return true;
  }

  return false;
};
