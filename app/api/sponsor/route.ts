import { NextResponse } from "next/server";
import { SponsorOrderStatus } from "@/generated/prisma";
import { buildCashfreeHeaders, getCashfreeBaseUrl } from "@/lib/cashfree/config";
import { getPrisma } from "@/lib/prisma";
import {
  releaseExpiredReservations,
  reserveLearnerForSponsorship,
} from "@/lib/sponsorship/reservation";
import { checkLearnerAvailableForSponsorship } from "@/lib/sponsorship/validate-learner-available";
import { createSponsorOrderId, parseSponsorBody } from "@/lib/validation/sponsor";

/** Frees the learner immediately when checkout never started. */
const abandonReservation = async (
  prisma: ReturnType<typeof getPrisma>,
  reservationId: string,
): Promise<void> => {
  try {
    await prisma.sponsorOrder.update({
      where: { id: reservationId },
      data: { status: SponsorOrderStatus.FAILED },
    });
  } catch (error) {
    console.error("Failed to release sponsor reservation:", error);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseSponsorBody(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { name, email, phone, plan, amount, learner_id: learnerId } = parsed.data;
    const prisma = getPrisma();

    await releaseExpiredReservations(prisma, learnerId);

    const availability = await checkLearnerAvailableForSponsorship(prisma, learnerId);
    if (!availability.available) {
      const status = availability.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ error: availability.message }, { status });
    }

    const orderId = createSponsorOrderId();

    // Claim the learner before contacting the gateway so two sponsors cannot both check out.
    const reservation = await reserveLearnerForSponsorship(prisma, {
      orderId,
      name,
      email,
      phone,
      plan,
      amount,
      learnerId,
    });

    if (!reservation.reserved) {
      return NextResponse.json(
        { error: "Someone is checking out for this learner right now. Please try again." },
        { status: 409 },
      );
    }

    let cashfreeRes: Response;

    try {
      cashfreeRes = await fetch(`${getCashfreeBaseUrl()}/orders`, {
        method: "POST",
        headers: buildCashfreeHeaders(),
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
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/thank-you?order_id=${orderId}`,
          },
        }),
      });
    } catch (error) {
      await abandonReservation(prisma, reservation.id);
      throw error;
    }

    if (!cashfreeRes.ok) {
      const errData = await cashfreeRes.json().catch(() => null);
      console.error("Cashfree error:", errData);
      await abandonReservation(prisma, reservation.id);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    const cashfreeData = await cashfreeRes.json();

    await prisma.sponsorOrder.update({
      where: { id: reservation.id },
      data: { paymentSessionId: cashfreeData.payment_session_id },
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
