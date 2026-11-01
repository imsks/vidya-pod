import { NextResponse } from "next/server";
import { internalError, jsonError } from "@/lib/api/respond";
import { syncSponsorOrderFromCashfree } from "@/lib/cashfree/sync-sponsor-order";
import { getSponsorOrdersForStatus } from "@/lib/data/sponsor-order";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const prisma = getPrisma();

    let orders = await getSponsorOrdersForStatus(prisma, orderId);

    if (orders.length === 0) {
      return jsonError("Order not found", 404);
    }

    if (orders.some((order) => order.status === "PENDING" || order.status === "EXPIRED")) {
      await syncSponsorOrderFromCashfree(prisma, orderId);
      orders = await getSponsorOrdersForStatus(prisma, orderId);
    }

    const [order] = orders;
    const isPaid = orders.some((row) => row.status === "SUCCESS");

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        status: isPaid ? "SUCCESS" : order.status,
        plan: order.plan,
        amount: orders.reduce((total, row) => total + row.amount, 0),
        learner: order.learner
          ? {
              name: order.learner.name,
              standard: order.learner.standard,
            }
          : null,
        sponsored_until: order.learner?.sponsorshipEndsAt?.toISOString() ?? null,
        sponsor: order.sponsor ? { name: order.sponsor.name } : null,
      },
    });
  } catch (error) {
    return internalError(error, "Error fetching sponsor order");
  }
}
