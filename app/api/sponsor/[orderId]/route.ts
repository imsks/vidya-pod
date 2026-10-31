import { NextResponse } from "next/server";
import { internalError, jsonError } from "@/lib/api/respond";
import { syncSponsorOrderFromCashfree } from "@/lib/cashfree/sync-sponsor-order";
import { getSponsorOrderForStatus } from "@/lib/data/sponsor-order";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const prisma = getPrisma();

    let order = await getSponsorOrderForStatus(prisma, orderId);

    if (!order) {
      return jsonError("Order not found", 404);
    }

    if (order.status === "PENDING" || order.status === "EXPIRED") {
      await syncSponsorOrderFromCashfree(prisma, orderId);
      order = (await getSponsorOrderForStatus(prisma, orderId)) ?? order;
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
        sponsor: order.sponsor ? { name: order.sponsor.name } : null,
      },
    });
  } catch (error) {
    return internalError(error, "Error fetching sponsor order");
  }
}
