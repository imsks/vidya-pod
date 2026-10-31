import type { PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus, SponsorshipCartStatus } from "@/generated/prisma";
import { buildCashfreeHeaders, getCashfreeBaseUrl } from "@/lib/cashfree/config";
import {
  buildCartLineOrderId,
  createCartOrderId,
  type CartCheckoutInput,
} from "@/lib/validation/sponsorship-cart";
import {
  CART_IN_PROGRESS_MESSAGE,
  CART_NOT_FOUND_MESSAGE,
  CART_PAID_MESSAGE,
  LEARNERS_UNAVAILABLE_MESSAGE,
  cartError,
  cartLearnerSelect,
  collectUnavailableLearners,
  loadCart,
  refreshCartPaymentState,
  releaseCheckoutAttempt,
  type CartServiceResult,
} from "./cart";
import { computeCartTotals, validateCartAmount, validateCartLearnerCount } from "./cart-totals";
import type { CartCheckoutResponse } from "./cart-types";
import { releaseExpiredReservations, reserveLearnerForSponsorship } from "./reservation";
import {
  LEARNER_UNAVAILABLE_MESSAGES,
  getLearnersAvailability,
} from "./validate-learner-available";

export const CART_CHANGED_MESSAGE =
  "Your cart changed while checking out. Please review it and try again.";

const sameLearners = (a: string[], b: string[]): boolean => {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
};

/**
 * Starts one Cashfree payment for every learner in the cart. Each learner is held with its own
 * PENDING order (sharing `paymentOrderId`) before the gateway is contacted, exactly like the
 * single-learner flow, so two donors can never pay for the same learner at the same time.
 *
 * Retrying with the same `idempotency_key` while the payment is open returns the same session
 * instead of creating a second charge.
 */
export const startCartCheckout = async (
  prisma: PrismaClient,
  cartId: string,
  input: CartCheckoutInput,
): Promise<CartServiceResult<CartCheckoutResponse>> => {
  await refreshCartPaymentState(prisma, cartId);

  const cart = await loadCart(prisma, cartId);

  if (!cart) {
    return cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  if (cart.status === SponsorshipCartStatus.PAID) {
    return cartError(409, CART_PAID_MESSAGE);
  }

  if (cart.status === SponsorshipCartStatus.PENDING_PAYMENT) {
    const isRetry =
      input.idempotency_key !== undefined && cart.checkoutKey === input.idempotency_key;

    if (isRetry && cart.orderId && cart.paymentSessionId) {
      return {
        ok: true,
        data: {
          orderId: cart.orderId,
          paymentSessionId: cart.paymentSessionId,
          amount: cart.amount ?? input.amount,
          replayed: true,
        },
      };
    }

    return cartError(409, CART_IN_PROGRESS_MESSAGE);
  }

  const learnerIds = cart.items.map((item) => item.learner.id);
  const countError = validateCartLearnerCount(learnerIds.length);

  if (countError) {
    return cartError(400, countError);
  }

  const amountError = validateCartAmount(input.plan, learnerIds.length, input.amount);

  if (amountError) {
    return cartError(400, amountError);
  }

  // Settles or expires stale holds first; a late payment may have sponsored a learner meanwhile.
  for (const learnerId of learnerIds) {
    await releaseExpiredReservations(prisma, learnerId);
  }

  const learners = await prisma.learner.findMany({
    where: { id: { in: learnerIds } },
    select: cartLearnerSelect,
  });
  const unavailable = collectUnavailableLearners(
    learners,
    await getLearnersAvailability(prisma, learners),
  );

  if (unavailable.length > 0) {
    return cartError(409, LEARNERS_UNAVAILABLE_MESSAGE, unavailable);
  }

  const { total, unitAmount } = computeCartTotals(input.plan, learnerIds.length);
  const paymentOrderId = createCartOrderId();

  const claim = await prisma.sponsorshipCart.updateMany({
    where: { id: cart.id, status: cart.status, orderId: cart.orderId },
    data: {
      status: SponsorshipCartStatus.PENDING_PAYMENT,
      orderId: paymentOrderId,
      checkoutKey: input.idempotency_key ?? null,
      amount: total,
      plan: input.plan,
      paymentSessionId: null,
      checkoutStartedAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return cartError(409, CART_IN_PROGRESS_MESSAGE);
  }

  const currentItems = await prisma.sponsorshipCartItem.findMany({
    where: { cartId: cart.id },
    select: { learnerId: true },
  });

  if (
    !sameLearners(
      learnerIds,
      currentItems.map((item) => item.learnerId),
    )
  ) {
    await releaseCheckoutAttempt(prisma, cart.id, paymentOrderId, SponsorOrderStatus.FAILED);
    return cartError(409, CART_CHANGED_MESSAGE);
  }

  const { name, email, phone, plan } = input;

  for (const [index, learner] of cart.items.map((item) => item.learner).entries()) {
    const reservation = await reserveLearnerForSponsorship(prisma, {
      orderId: buildCartLineOrderId(paymentOrderId, index + 1),
      name,
      email,
      phone,
      plan,
      amount: unitAmount,
      learnerId: learner.id,
      cartId: cart.id,
      paymentOrderId,
    });

    if (!reservation.reserved) {
      await releaseCheckoutAttempt(prisma, cart.id, paymentOrderId, SponsorOrderStatus.FAILED);
      return cartError(409, LEARNERS_UNAVAILABLE_MESSAGE, [
        {
          learner_id: learner.id,
          name: learner.name,
          reason: "pending_order",
          message: LEARNER_UNAVAILABLE_MESSAGES.pending_order,
        },
      ]);
    }
  }

  let cashfreeRes: Response;

  try {
    cashfreeRes = await fetch(`${getCashfreeBaseUrl()}/orders`, {
      method: "POST",
      headers: buildCashfreeHeaders(),
      body: JSON.stringify({
        order_id: paymentOrderId,
        order_amount: total,
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
    await releaseCheckoutAttempt(prisma, cart.id, paymentOrderId, SponsorOrderStatus.FAILED);
    throw error;
  }

  if (!cashfreeRes.ok) {
    const errData = await cashfreeRes.json().catch(() => null);
    console.error("Cashfree error:", errData);
    await releaseCheckoutAttempt(prisma, cart.id, paymentOrderId, SponsorOrderStatus.FAILED);
    return cartError(502, "Payment gateway error");
  }

  const { payment_session_id: paymentSessionId } = (await cashfreeRes.json()) as {
    payment_session_id: string;
  };

  await prisma.sponsorOrder.updateMany({
    where: { paymentOrderId },
    data: { paymentSessionId },
  });
  await prisma.sponsorshipCart.updateMany({
    where: { id: cart.id, orderId: paymentOrderId },
    data: { paymentSessionId },
  });

  return {
    ok: true,
    data: { orderId: paymentOrderId, paymentSessionId, amount: total, replayed: false },
  };
};
