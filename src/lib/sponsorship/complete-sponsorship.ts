import type { PrismaClient, SponsorOrder } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";

export type CompleteSponsorshipResult =
  | { success: true; order: SponsorOrder; alreadyCompleted: boolean }
  | { success: false; reason: "order_not_found" | "invalid_status" };

export const completeSponsorshipPayment = async (
  prisma: PrismaClient,
  orderId: string,
): Promise<CompleteSponsorshipResult> => {
  const order = await prisma.sponsorOrder.findUnique({
    where: { orderId },
  });

  if (!order) {
    return { success: false, reason: "order_not_found" };
  }

  if (order.status === SponsorOrderStatus.SUCCESS) {
    return { success: true, order, alreadyCompleted: true };
  }

  if (order.status !== SponsorOrderStatus.PENDING) {
    return { success: false, reason: "invalid_status" };
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    let sponsor = await tx.sponsor.findFirst({
      where: { email: order.email },
    });

    if (!sponsor) {
      sponsor = await tx.sponsor.create({
        data: {
          name: order.name,
          email: order.email,
          phone: order.phone,
        },
      });
    }

    const updated = await tx.sponsorOrder.update({
      where: { id: order.id },
      data: {
        status: SponsorOrderStatus.SUCCESS,
        sponsorId: sponsor.id,
      },
    });

    if (order.learnerId) {
      const learner = await tx.learner.findUnique({
        where: { id: order.learnerId },
        select: { sponsorId: true },
      });

      if (learner && learner.sponsorId === null) {
        await tx.learner.update({
          where: { id: order.learnerId },
          data: { sponsorId: sponsor.id },
        });
      }
    }

    return updated;
  });

  return { success: true, order: updatedOrder, alreadyCompleted: false };
};

export const failSponsorshipPayment = async (
  prisma: PrismaClient,
  orderId: string,
): Promise<CompleteSponsorshipResult> => {
  const order = await prisma.sponsorOrder.findUnique({
    where: { orderId },
  });

  if (!order) {
    return { success: false, reason: "order_not_found" };
  }

  if (order.status === SponsorOrderStatus.SUCCESS) {
    return { success: true, order, alreadyCompleted: true };
  }

  if (order.status === SponsorOrderStatus.FAILED) {
    return { success: true, order, alreadyCompleted: true };
  }

  const updated = await prisma.sponsorOrder.update({
    where: { id: order.id },
    data: { status: SponsorOrderStatus.FAILED },
  });

  return { success: true, order: updated, alreadyCompleted: false };
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
