import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { name, email, phone, plan, amount } = body;

    if (!name || !email || !phone || !plan || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const orderId = `VP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const cashfreeRes = await fetch(
      `${process.env.CASHFREE_BASE_URL}/orders`,
      {
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
      },
    );

    if (!cashfreeRes.ok) {
      const errData = await cashfreeRes.json();
      console.error("Cashfree error:", errData);
      return NextResponse.json(
        { error: "Payment gateway error" },
        { status: 502 },
      );
    }

    const cashfreeData = await cashfreeRes.json();

    const { error: dbError } = await supabase.from("sponsor_orders").insert({
      order_id: orderId,
      name,
      email,
      phone,
      plan,
      amount,
      status: "PENDING",
      payment_session_id: cashfreeData.payment_session_id,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      orderId,
      paymentSessionId: cashfreeData.payment_session_id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
