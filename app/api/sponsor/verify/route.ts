import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { SponsorOrder } from "@/lib/models";

const verifySchema = z.object({
  order_id: z.string().min(1, "order_id is required"),
});

type VerifiedStatus = "PENDING" | "SUCCESS" | "FAILED";

/**
 * Cashfree order_status values are mapped conservatively: anything we don't
 * recognise stays PENDING and is never written, so a new gateway status can
 * never mass-mark real orders as FAILED. A later call self-heals.
 */
const mapOrderStatus = (orderStatus: unknown): VerifiedStatus => {
  switch (orderStatus) {
    case "PAID":
      return "SUCCESS";
    case "EXPIRED":
    case "TERMINATED":
      return "FAILED";
    default:
      return "PENDING";
  }
};

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const parsed = verifySchema.safeParse({
      order_id: searchParams.get("order_id") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { order_id: orderId } = parsed.data;

    // Look the order up first so an unknown id never triggers an outbound
    // call — otherwise anyone could drive traffic against our Cashfree quota.
    const order = await SponsorOrder.findOne({ order_id: orderId });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const cashfreeRes = await fetch(
      `${process.env.CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": process.env.CASHFREE_CLIENT_ID!,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
        },
        // Payment status changes; a cached response could report a stale one.
        cache: "no-store",
      },
    );

    if (!cashfreeRes.ok) {
      console.error("Cashfree error: status", cashfreeRes.status);
      return NextResponse.json(
        { error: "Payment gateway error" },
        { status: 502 },
      );
    }

    const cashfreeData = await cashfreeRes.json();
    const status = mapOrderStatus(cashfreeData.order_status);

    // Only terminal states are persisted. Note the filter is not guarded on
    // status: Cashfree allows retrying a failed order, so a FAILED row must
    // still be able to move to SUCCESS. The write is idempotent because it
    // mirrors Cashfree's authoritative state rather than applying a delta.
    if (status !== "PENDING") {
      // paid_at is only stamped the first time an order is confirmed paid, so
      // it keeps meaning "when this was paid" rather than "when we last looked".
      const stampPaidAt = status === "SUCCESS" && !order.paid_at;

      await SponsorOrder.findOneAndUpdate(
        { order_id: orderId },
        {
          status,
          cf_order_id: cashfreeData.cf_order_id,
          ...(stampPaidAt ? { paid_at: new Date() } : {}),
        },
        { new: true },
      );
    }

    // Projected deliberately: order_id embeds Date.now() and is guessable, so
    // it must never unlock donor name, email, phone or payment_session_id.
    return NextResponse.json({
      orderId,
      status,
      amount: order.amount,
      plan: order.plan,
    });
  } catch (error) {
    console.error("Error in sponsor verify route:", (error as Error).message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
