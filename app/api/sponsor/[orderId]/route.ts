import { NextResponse } from "next/server";
import { syncSponsorOrderFromCashfree } from "@/lib/cashfree/sync-sponsor-order";
import { getPrisma } from "@/lib/prisma";

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
    },
  },
} as const;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const prisma = getPrisma();

    let order = await prisma.sponsorOrder.findUnique({
      where: { orderId },
      select: orderSelect,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "PENDING") {
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
      },
    });
  } catch (error) {
    console.error("Error fetching sponsor order:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
