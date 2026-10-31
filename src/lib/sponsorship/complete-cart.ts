import type { PrismaClient, SponsorOrder } from "@/generated/prisma";
import { SponsorOrderStatus, SponsorshipCartStatus } from "@/generated/prisma";
import { isLearnerSponsored } from "./availability";
import { sponsorshipEndFor } from "./period";
import { generateShareSlug } from "./share-url";

export type CartPaymentResult =
  | {
      success: true;
      status: typeof SponsorOrderStatus.SUCCESS | typeof SponsorOrderStatus.FAILED;
      orders: SponsorOrder[];
      alreadyCompleted: boolean;
    }
  | { success: false; reason: "order_not_found" };

const findCartOrders = (prisma: PrismaClient, paymentOrderId: string) =>
  prisma.sponsorOrder.findMany({
    where: { paymentOrderId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

/**
 * Settles every learner paid for by one combined cart payment. A success callback means the
 * money was captured, so learners whose hold expired or whose earlier attempt failed are still
 * settled. Each order is updated only if it is not already SUCCESS, which makes duplicate or
 * concurrent callbacks (webhook + status sync) harmless.
 */
export const completeCartPayment = async (
  prisma: PrismaClient,
  paymentOrderId: string,
): Promise<CartPaymentResult> => {
  const orders = await findCartOrders(prisma, paymentOrderId);

  if (orders.length === 0) {
    return { success: false, reason: "order_not_found" };
  }

  const unsettled = orders.filter((order) => order.status !== SponsorOrderStatus.SUCCESS);
  const cartIds = [...new Set(orders.map((order) => order.cartId).filter((id) => id !== null))];

  if (unsettled.length > 0) {
    await prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      const [first] = orders;
      const sponsor =
        (await tx.sponsor.findFirst({ where: { email: first.email } })) ??
        (await tx.sponsor.create({
          data: { name: first.name, email: first.email, phone: first.phone },
        }));

      for (const order of unsettled) {
        const { count } = await tx.sponsorOrder.updateMany({
          where: { id: order.id, status: { not: SponsorOrderStatus.SUCCESS } },
          data: {
            status: SponsorOrderStatus.SUCCESS,
            sponsorId: sponsor.id,
            shareSlug: order.shareSlug ?? generateShareSlug(),
          },
        });

        // Another callback settled this learner first.
        if (count === 0 || !order.learnerId) {
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

      if (cartIds.length > 0) {
        await tx.sponsorshipCart.updateMany({
          where: { id: { in: cartIds }, status: { not: SponsorshipCartStatus.PAID } },
          data: { status: SponsorshipCartStatus.PAID },
        });
      }
    });
  }

  return {
    success: true,
    status: SponsorOrderStatus.SUCCESS,
    orders: unsettled.length > 0 ? await findCartOrders(prisma, paymentOrderId) : orders,
    alreadyCompleted: unsettled.length === 0,
  };
};

/**
 * Marks every learner of a failed cart payment as FAILED so they can be sponsored again.
 * A failure never overrides a captured payment, and only unlocks the cart if this payment is
 * still its latest checkout attempt.
 */
export const failCartPayment = async (
  prisma: PrismaClient,
  paymentOrderId: string,
): Promise<CartPaymentResult> => {
  const orders = await findCartOrders(prisma, paymentOrderId);

  if (orders.length === 0) {
    return { success: false, reason: "order_not_found" };
  }

  if (orders.some((order) => order.status === SponsorOrderStatus.SUCCESS)) {
    return { success: true, status: SponsorOrderStatus.SUCCESS, orders, alreadyCompleted: true };
  }

  const { count } = await prisma.sponsorOrder.updateMany({
    where: {
      paymentOrderId,
      status: { in: [SponsorOrderStatus.PENDING, SponsorOrderStatus.EXPIRED] },
    },
    data: { status: SponsorOrderStatus.FAILED },
  });

  const cartIds = [...new Set(orders.map((order) => order.cartId).filter((id) => id !== null))];

  if (cartIds.length > 0) {
    await prisma.sponsorshipCart.updateMany({
      where: {
        id: { in: cartIds },
        orderId: paymentOrderId,
        status: SponsorshipCartStatus.PENDING_PAYMENT,
      },
      data: { status: SponsorshipCartStatus.FAILED, paymentSessionId: null },
    });
  }

  return {
    success: true,
    status: SponsorOrderStatus.FAILED,
    orders: count > 0 ? await findCartOrders(prisma, paymentOrderId) : orders,
    alreadyCompleted: count === 0,
  };
};

/** One status for a combined payment, as shown to the donor. */
export const summarizeCartPaymentStatus = (statuses: SponsorOrderStatus[]): SponsorOrderStatus => {
  if (statuses.includes(SponsorOrderStatus.SUCCESS)) return SponsorOrderStatus.SUCCESS;
  if (statuses.includes(SponsorOrderStatus.PENDING)) return SponsorOrderStatus.PENDING;
  if (statuses.includes(SponsorOrderStatus.FAILED)) return SponsorOrderStatus.FAILED;
  return SponsorOrderStatus.EXPIRED;
};
