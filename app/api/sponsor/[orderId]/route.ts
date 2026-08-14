import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const prisma = getPrisma();

    const order = await prisma.sponsorOrder.findUnique({
      where: { orderId },
      select: {
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
        sponsor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
