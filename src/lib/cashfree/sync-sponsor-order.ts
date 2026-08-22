import type { PrismaClient } from "@/generated/prisma";
import { isCashfreeConfigured } from "@/lib/cashfree/config";
import {
  fetchCashfreeOrder,
  fetchCashfreePaymentsForOrder,
  hasSuccessfulCashfreePayment,
  hasTerminalFailedCashfreePayment,
  isCashfreeOrderPaid,
  isCashfreeOrderTerminalFailure,
} from "@/lib/cashfree/fetch-order";
import {
  completeSponsorshipPayment,
  failSponsorshipPayment,
} from "@/lib/sponsorship/complete-sponsorship";

/**
 * Reconcile a pending sponsor order against Cashfree when webhooks are unavailable
 * (e.g. localhost) or delayed. Returns true when the local order status was updated.
 */
export const syncSponsorOrderFromCashfree = async (
  prisma: PrismaClient,
  orderId: string,
): Promise<boolean> => {
  if (!isCashfreeConfigured()) {
    return false;
  }

  const existingOrder = await prisma.sponsorOrder.findUnique({
    where: { orderId },
    select: { status: true },
  });

  if (!existingOrder || existingOrder.status !== "PENDING") {
    return false;
  }

  try {
    const cashfreeOrder = await fetchCashfreeOrder(orderId);

    if (!cashfreeOrder) {
      return false;
    }

    if (isCashfreeOrderPaid(cashfreeOrder)) {
      const result = await completeSponsorshipPayment(prisma, orderId);
      return result.success && !result.alreadyCompleted;
    }

    if (isCashfreeOrderTerminalFailure(cashfreeOrder)) {
      const result = await failSponsorshipPayment(prisma, orderId);
      return result.success && !result.alreadyCompleted;
    }

    const payments = await fetchCashfreePaymentsForOrder(orderId);

    if (hasSuccessfulCashfreePayment(payments)) {
      const result = await completeSponsorshipPayment(prisma, orderId);
      return result.success && !result.alreadyCompleted;
    }

    if (hasTerminalFailedCashfreePayment(payments)) {
      const result = await failSponsorshipPayment(prisma, orderId);
      return result.success && !result.alreadyCompleted;
    }

    return false;
  } catch (error) {
    console.error("Failed to sync sponsor order from Cashfree:", error);
    return false;
  }
};
