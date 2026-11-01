import type { PrismaClient } from "@/generated/prisma";
import { PRICING } from "@/constants/pricing";
import { buildCashfreeHeaders, getCashfreeBaseUrl } from "@/lib/cashfree/config";
import { attachPaymentSession, markPaymentOrderFailed } from "@/lib/data/sponsor-order";
import { createSponsorOrderId, type SponsorInput } from "@/lib/validation/sponsor";
import { releaseExpiredReservations, reserveLearnerForSponsorship } from "./reservation";
import { checkLearnerAvailableForSponsorship } from "./validate-learner-available";

export type UnavailableLearner = { learner_id: string; message: string };

export type CheckoutResult =
  | { ok: true; orderId: string; paymentSessionId: string; amount: number }
  | { ok: false; status: 409 | 502; error: string; unavailable?: UnavailableLearner[] };

const SOME_UNAVAILABLE = "Some children are no longer available. Remove them to continue.";
const LOST_RACE = "Someone is checking out for this learner right now. Please try again.";

/**
 * Starts one Cashfree payment for every learner. Each learner gets its own SponsorOrder row
 * (priced per child, held like a single sponsorship) and all rows share `paymentOrderId`.
 */
export const startSponsorshipCheckout = async (
  prisma: PrismaClient,
  input: SponsorInput,
): Promise<CheckoutResult> => {
  const {
    name,
    email,
    phone,
    plan,
    learner_ids: learnerIds,
    public_acknowledgement_opt_in: publicAcknowledgementOptIn,
  } = input;

  const unavailable: UnavailableLearner[] = [];

  for (const learnerId of learnerIds) {
    await releaseExpiredReservations(prisma, learnerId);
    const availability = await checkLearnerAvailableForSponsorship(prisma, learnerId);
    if (!availability.available) {
      unavailable.push({ learner_id: learnerId, message: availability.message });
    }
  }

  if (unavailable.length > 0) {
    const error = learnerIds.length === 1 ? unavailable[0].message : SOME_UNAVAILABLE;
    return { ok: false, status: 409, error, unavailable };
  }

  const paymentOrderId = createSponsorOrderId();
  const unitAmount = PRICING[plan].total;
  const amount = unitAmount * learnerIds.length;

  // Hold every learner before contacting the gateway so two donors cannot pay for the same child.
  for (const [index, learnerId] of learnerIds.entries()) {
    const reservation = await reserveLearnerForSponsorship(prisma, {
      orderId: `${paymentOrderId}-${index + 1}`,
      paymentOrderId,
      name,
      email,
      phone,
      plan,
      amount: unitAmount,
      learnerId,
      publicAcknowledgementOptIn,
    });

    if (!reservation.reserved) {
      await markPaymentOrderFailed(prisma, paymentOrderId);
      return {
        ok: false,
        status: 409,
        error: learnerIds.length === 1 ? LOST_RACE : SOME_UNAVAILABLE,
        unavailable: [{ learner_id: learnerId, message: LOST_RACE }],
      };
    }
  }

  let cashfreeRes: Response;

  try {
    cashfreeRes = await fetch(`${getCashfreeBaseUrl()}/orders`, {
      method: "POST",
      headers: buildCashfreeHeaders(),
      body: JSON.stringify({
        order_id: paymentOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${Date.now()}`,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/thank-you?order_id=${paymentOrderId}`,
        },
      }),
    });
  } catch (error) {
    await markPaymentOrderFailed(prisma, paymentOrderId);
    throw error;
  }

  if (!cashfreeRes.ok) {
    const errData = await cashfreeRes.json().catch(() => null);
    console.error("Cashfree error:", errData);
    await markPaymentOrderFailed(prisma, paymentOrderId);
    return { ok: false, status: 502, error: "Payment gateway error" };
  }

  const { payment_session_id: paymentSessionId } = (await cashfreeRes.json()) as {
    payment_session_id: string;
  };

  await attachPaymentSession(prisma, paymentOrderId, paymentSessionId);

  return { ok: true, orderId: paymentOrderId, paymentSessionId, amount };
};
