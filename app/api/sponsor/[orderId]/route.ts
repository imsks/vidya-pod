import { NextResponse } from "next/server";
import { syncSponsorOrderFromCashfree } from "@/lib/cashfree/sync-sponsor-order";
import type { PrismaClient } from "@/generated/prisma";
import { getPrisma } from "@/lib/prisma";
import { summarizeCartPaymentStatus } from "@/lib/sponsorship/complete-cart";
import { isCartOrderId } from "@/lib/validation/sponsorship-cart";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const orderSelect = {
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
      email: true,
    },
  },
} as const;

const findCartPaymentOrders = (prisma: PrismaClient, paymentOrderId: string) =>
  prisma.sponsorOrder.findMany({
    where: { paymentOrderId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: orderSelect,
  });

/** A combined cart payment reports every learner it pays for. */
const getCartPaymentStatus = async (prisma: PrismaClient, paymentOrderId: string) => {
  let orders = await findCartPaymentOrders(prisma, paymentOrderId);

  if (orders.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (orders.some((order) => order.status === "PENDING" || order.status === "EXPIRED")) {
    await syncSponsorOrderFromCashfree(prisma, paymentOrderId);
    const refreshed = await findCartPaymentOrders(prisma, paymentOrderId);
    orders = refreshed.length > 0 ? refreshed : orders;
  }

  const sponsor = orders.find((order) => order.sponsor)?.sponsor ?? null;

  return NextResponse.json({
    success: true,
    data: {
      order_id: paymentOrderId,
      status: summarizeCartPaymentStatus(orders.map((order) => order.status)),
      plan: orders[0].plan,
      amount: orders.reduce((total, order) => total + order.amount, 0),
      learner: null,
      learners: orders.flatMap((order) =>
        order.learner
          ? [
              {
                name: order.learner.name,
                standard: order.learner.standard,
                sponsored_until: order.learner.sponsorshipEndsAt?.toISOString() ?? null,
              },
            ]
          : [],
      ),
      sponsored_until: null,
      sponsor: sponsor ? { name: sponsor.name, email: sponsor.email } : null,
    },
  });
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const prisma = getPrisma();

    if (isCartOrderId(orderId)) {
      return await getCartPaymentStatus(prisma, orderId);
    }

    let order = await prisma.sponsorOrder.findUnique({
      where: { orderId },
      select: orderSelect,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "PENDING" || order.status === "EXPIRED") {
      await syncSponsorOrderFromCashfree(prisma, orderId);
      order =
        (await prisma.sponsorOrder.findUnique({
          where: { orderId },
          select: orderSelect,
        })) ?? order;
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.orderId,
        status: order.status,
        plan: order.plan,
        amount: order.amount,
        learner: order.learner
          ? {
              name: order.learner.name,
              standard: order.learner.standard,
            }
          : null,
        sponsored_until: order.learner?.sponsorshipEndsAt?.toISOString() ?? null,
        sponsor: order.sponsor
          ? {
              name: order.sponsor.name,
              email: order.sponsor.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching sponsor order:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
