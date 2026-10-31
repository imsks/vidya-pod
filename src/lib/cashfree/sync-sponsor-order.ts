import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";
import { isCashfreeConfigured } from "@/lib/cashfree/config";
import {
  fetchCashfreeOrder,
  fetchCashfreePaymentsForOrder,
  hasSuccessfulCashfreePayment,
  hasTerminalFailedCashfreePayment,
  isCashfreeOrderPaid,
  isCashfreeOrderTerminalFailure,
} from "@/lib/cashfree/fetch-order";
import { completeCartPayment, failCartPayment } from "@/lib/sponsorship/complete-cart";
import {
  completeSponsorshipPayment,
  failSponsorshipPayment,
} from "@/lib/sponsorship/complete-sponsorship";
import { isCartOrderId } from "@/lib/validation/sponsorship-cart";

type SettleResult = { success: boolean; alreadyCompleted?: boolean };

type Settlers = {
  complete: (prisma: PrismaClient, orderId: string) => Promise<SettleResult>;
  fail: (prisma: PrismaClient, orderId: string) => Promise<SettleResult>;
};

const singleOrderSettlers: Settlers = {
  complete: completeSponsorshipPayment,
  fail: failSponsorshipPayment,
};

const cartPaymentSettlers: Settlers = {
  complete: completeCartPayment,
  fail: failCartPayment,
};

const needsSingleOrderSync = async (prisma: PrismaClient, orderId: string): Promise<boolean> => {
  const existingOrder = await prisma.sponsorOrder.findUnique({
    where: { orderId },
    select: { status: true },
  });

  if (!existingOrder) {
    return false;
  }

  return existingOrder.status === "PENDING" || existingOrder.status === "EXPIRED";
};

/** A combined payment needs reconciling while any of its learners is still unsettled. */
const needsCartPaymentSync = async (
  prisma: PrismaClient,
  paymentOrderId: string,
): Promise<boolean> => {
  const unsettled = await prisma.sponsorOrder.count({
    where: {
      paymentOrderId,
      status: { in: [SponsorOrderStatus.PENDING, SponsorOrderStatus.EXPIRED] },
    },
  });

  return unsettled > 0;
};

const settle = async (
  settler: Settlers[keyof Settlers],
  prisma: PrismaClient,
  orderId: string,
): Promise<boolean> => {
  const result = await settler(prisma, orderId);
  return result.success && !result.alreadyCompleted;
};

/**
 * Reconcile a pending sponsor order against Cashfree when webhooks are unavailable
 * (e.g. localhost) or delayed. Returns true when the local order status was updated.
 * Cart order ids reconcile every learner order that shares the combined payment.
 */
export const syncSponsorOrderFromCashfree = async (
  prisma: PrismaClient,
  orderId: string,
): Promise<boolean> => {
  if (!isCashfreeConfigured()) {
    return false;
  }

  const isCartPayment = isCartOrderId(orderId);
  const settlers = isCartPayment ? cartPaymentSettlers : singleOrderSettlers;
  const needsSync = isCartPayment
    ? await needsCartPaymentSync(prisma, orderId)
    : await needsSingleOrderSync(prisma, orderId);

  if (!needsSync) {
    return false;
  }

  try {
    const cashfreeOrder = await fetchCashfreeOrder(orderId);

    if (!cashfreeOrder) {
      return false;
    }

    if (isCashfreeOrderPaid(cashfreeOrder)) {
      return await settle(settlers.complete, prisma, orderId);
    }

    if (isCashfreeOrderTerminalFailure(cashfreeOrder)) {
      return await settle(settlers.fail, prisma, orderId);
    }

    const payments = await fetchCashfreePaymentsForOrder(orderId);

    if (hasSuccessfulCashfreePayment(payments)) {
      return await settle(settlers.complete, prisma, orderId);
    }

    if (hasTerminalFailedCashfreePayment(payments)) {
      return await settle(settlers.fail, prisma, orderId);
    }

    return false;
  } catch (error) {
    console.error("Failed to sync sponsor order from Cashfree:", error);
    return false;
  }
};
