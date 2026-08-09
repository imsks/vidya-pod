import { NextResponse } from "next/server";
import { SponsorOrderStatus } from "@/generated/prisma";
import { getPrisma } from "@/lib/prisma";
import { createSponsorOrderId, parseSponsorBody } from "@/lib/validation/sponsor";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseSponsorBody(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { name, email, phone, plan, amount } = parsed.data;
    const orderId = createSponsorOrderId();

    const cashfreeRes = await fetch(`${process.env.CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_CLIENT_ID!,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${Date.now()}`,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor?order_id=${orderId}`,
        },
      }),
    });

    if (!cashfreeRes.ok) {
      const errData = await cashfreeRes.json();
      console.error("Cashfree error:", errData);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    const cashfreeData = await cashfreeRes.json();

    const prisma = getPrisma();
    await prisma.sponsorOrder.create({
      data: {
        orderId,
        name,
        email,
        phone,
        plan,
        amount,
        status: SponsorOrderStatus.PENDING,
        paymentSessionId: cashfreeData.payment_session_id,
      },
    });

    return NextResponse.json({
      orderId,
      paymentSessionId: cashfreeData.payment_session_id,
    });
  } catch (error) {
    console.error("Error in sponsor route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
