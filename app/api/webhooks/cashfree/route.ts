import { NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree/verify-webhook";
import { getPrisma } from "@/lib/prisma";
import {
  completeSponsorshipPayment,
  failSponsorshipPayment,
  getOrderIdFromWebhookPayload,
  isPaymentFailedWebhook,
  isPaymentSuccessWebhook,
  type CashfreeWebhookPayload,
} from "@/lib/sponsorship/complete-sponsorship";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");
    const timestamp = request.headers.get("x-webhook-timestamp");
    const secret = process.env.CASHFREE_WEBHOOK_SECRET ?? "";

    if (!verifyCashfreeWebhookSignature(signature, timestamp, rawBody, secret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
    const orderId = getOrderIdFromWebhookPayload(payload);

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID in webhook payload" }, { status: 400 });
    }

    const prisma = getPrisma();

    if (isPaymentSuccessWebhook(payload)) {
      const result = await completeSponsorshipPayment(prisma, orderId);

      if (!result.success) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, status: result.order.status });
    }

    if (isPaymentFailedWebhook(payload)) {
      const result = await failSponsorshipPayment(prisma, orderId);

      if (!result.success) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, status: result.order.status });
    }

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error in Cashfree webhook:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
