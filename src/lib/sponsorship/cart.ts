import type { Prisma, PrismaClient } from "@/generated/prisma";
import { SponsorOrderStatus, SponsorshipCartStatus } from "@/generated/prisma";
import type { CreateCartInput, UpdateCartInput } from "@/lib/validation/sponsorship-cart";
import {
  CART_FULL_MESSAGE,
  MAX_CART_LEARNERS,
  MIN_CART_LEARNERS,
  canAddLearnerToCart,
  computeCartTotals,
} from "./cart-totals";
import type { CartResponse, UnavailableCartLearner } from "./cart-types";
import { getReservationCutoff } from "./reservation";
import {
  LEARNER_UNAVAILABLE_MESSAGES,
  checkLearnerAvailableForSponsorship,
  getLearnersAvailability,
  type LearnerAvailabilityStatus,
} from "./validate-learner-available";

export type CartServiceError = {
  ok: false;
  status: 400 | 404 | 409 | 502;
  error: string;
  unavailable?: UnavailableCartLearner[];
};

export type CartServiceResult<T> = { ok: true; data: T } | CartServiceError;

export const CART_NOT_FOUND_MESSAGE = "Cart not found";
export const CART_IN_PROGRESS_MESSAGE =
  "A payment is already in progress for this cart. Please wait a minute and try again.";
export const CART_PAID_MESSAGE =
  "This cart has already been paid for. Start a new cart to sponsor more learners.";
export const CART_DUPLICATE_MESSAGE = "This learner is already in your cart";
export const LEARNERS_UNAVAILABLE_MESSAGE =
  "Some learners are no longer available. Remove them to continue.";

const EDITABLE_STATUSES: SponsorshipCartStatus[] = [
  SponsorshipCartStatus.DRAFT,
  SponsorshipCartStatus.FAILED,
];

/** Learners can only be changed while no payment is running and none has succeeded. */
export const isCartEditable = (status: SponsorshipCartStatus): boolean =>
  EDITABLE_STATUSES.includes(status);

export const cartError = (
  status: CartServiceError["status"],
  error: string,
  unavailable?: UnavailableCartLearner[],
): CartServiceError => ({ ok: false, status, error, ...(unavailable ? { unavailable } : {}) });

export const lockedCartError = (status: SponsorshipCartStatus): CartServiceError =>
  cartError(
    409,
    status === SponsorshipCartStatus.PAID ? CART_PAID_MESSAGE : CART_IN_PROGRESS_MESSAGE,
  );

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export const cartLearnerSelect = {
  id: true,
  name: true,
  standard: true,
  imageUrl: true,
  sponsorId: true,
  sponsorshipEndsAt: true,
} satisfies Prisma.LearnerSelect;

export const cartInclude = {
  items: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { learner: { select: cartLearnerSelect } },
  },
} satisfies Prisma.SponsorshipCartInclude;

export type CartWithLearners = Prisma.SponsorshipCartGetPayload<{ include: typeof cartInclude }>;
export type CartLearner = CartWithLearners["items"][number]["learner"];

export const loadCart = (prisma: PrismaClient, cartId: string) =>
  prisma.sponsorshipCart.findUnique({ where: { id: cartId }, include: cartInclude });

export const collectUnavailableLearners = (
  learners: Array<Pick<CartLearner, "id" | "name">>,
  availability: Map<string, LearnerAvailabilityStatus>,
): UnavailableCartLearner[] =>
  learners.flatMap((learner) => {
    const status = availability.get(learner.id);
    return status && !status.available
      ? [
          {
            learner_id: learner.id,
            name: learner.name,
            reason: status.reason,
            message: status.message,
          },
        ]
      : [];
  });

export const serializeCart = async (
  prisma: PrismaClient,
  cart: CartWithLearners,
  now: Date = new Date(),
): Promise<CartResponse> => {
  const learners = cart.items.map((item) => item.learner);
  const editable = isCartEditable(cart.status);
  const availability = editable
    ? await getLearnersAvailability(prisma, learners, now)
    : new Map<string, LearnerAvailabilityStatus>();
  const totals = computeCartTotals(cart.plan, learners.length);

  return {
    id: cart.id,
    status: cart.status,
    plan: cart.plan,
    order_id: cart.orderId,
    can_edit: editable,
    items: learners.map((learner) => {
      const status = availability.get(learner.id);
      const unavailable = status && !status.available ? status : null;

      return {
        learner_id: learner.id,
        name: learner.name,
        standard: learner.standard,
        image_url: learner.imageUrl,
        available: unavailable === null,
        unavailable_reason: unavailable?.reason ?? null,
        message: unavailable?.message ?? null,
      };
    }),
    totals: {
      learner_count: totals.learnerCount,
      unit_amount: totals.unitAmount,
      total: totals.total,
    },
    limits: { min_learners: MIN_CART_LEARNERS, max_learners: MAX_CART_LEARNERS },
  };
};

/**
 * Ends a checkout attempt that will not be paid: its learner holds are released and the cart
 * becomes editable again. Guarded on the attempt's order id so a newer attempt is never touched.
 */
export const releaseCheckoutAttempt = async (
  prisma: PrismaClient,
  cartId: string,
  paymentOrderId: string,
  outcome: typeof SponsorOrderStatus.EXPIRED | typeof SponsorOrderStatus.FAILED,
): Promise<void> => {
  await prisma.sponsorOrder.updateMany({
    where: { paymentOrderId, status: SponsorOrderStatus.PENDING },
    data: { status: outcome },
  });

  await prisma.sponsorshipCart.updateMany({
    where: { id: cartId, orderId: paymentOrderId, status: SponsorshipCartStatus.PENDING_PAYMENT },
    data: { status: SponsorshipCartStatus.DRAFT, paymentSessionId: null },
  });
};

/**
 * A donor who closes the payment page leaves the cart in PENDING_PAYMENT. Once the attempt has
 * outlived the reservation window and none of its learner holds are active, the cart is
 * unlocked so it can be edited or checked out again.
 */
export const refreshCartPaymentState = async (
  prisma: PrismaClient,
  cartId: string,
  now: Date = new Date(),
): Promise<void> => {
  const cart = await prisma.sponsorshipCart.findUnique({
    where: { id: cartId },
    select: { status: true, orderId: true, checkoutStartedAt: true },
  });

  if (!cart || cart.status !== SponsorshipCartStatus.PENDING_PAYMENT || !cart.orderId) {
    return;
  }

  const cutoff = getReservationCutoff(now);

  if (cart.checkoutStartedAt && cart.checkoutStartedAt.getTime() >= cutoff.getTime()) {
    return;
  }

  const activeHolds = await prisma.sponsorOrder.count({
    where: {
      paymentOrderId: cart.orderId,
      status: SponsorOrderStatus.PENDING,
      createdAt: { gte: cutoff },
    },
  });

  if (activeHolds > 0) {
    return;
  }

  await releaseCheckoutAttempt(prisma, cartId, cart.orderId, SponsorOrderStatus.EXPIRED);
};

const respondWithCart = async (
  prisma: PrismaClient,
  cartId: string,
): Promise<CartServiceResult<CartResponse>> => {
  const cart = await loadCart(prisma, cartId);

  if (!cart) {
    return cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  return { ok: true, data: await serializeCart(prisma, cart) };
};

/** Changing a cart whose payment failed turns it back into a fresh draft. */
const finishEdit = async (
  prisma: PrismaClient,
  cartId: string,
): Promise<CartServiceResult<CartResponse>> => {
  await prisma.sponsorshipCart.updateMany({
    where: { id: cartId, status: SponsorshipCartStatus.FAILED },
    data: { status: SponsorshipCartStatus.DRAFT },
  });

  return respondWithCart(prisma, cartId);
};

const findCartForEdit = async (prisma: PrismaClient, cartId: string) => {
  await refreshCartPaymentState(prisma, cartId);

  return prisma.sponsorshipCart.findUnique({
    where: { id: cartId },
    select: { status: true, _count: { select: { items: true } } },
  });
};

export const getCart = async (
  prisma: PrismaClient,
  cartId: string,
): Promise<CartServiceResult<CartResponse>> => {
  await refreshCartPaymentState(prisma, cartId);
  return respondWithCart(prisma, cartId);
};

export const createCart = async (
  prisma: PrismaClient,
  input: CreateCartInput,
): Promise<CartServiceResult<CartResponse>> => {
  const learnerIds = input.learner_ids ?? [];

  if (learnerIds.length > 0) {
    const learners = await prisma.learner.findMany({
      where: { id: { in: learnerIds } },
      select: cartLearnerSelect,
    });

    if (learners.length !== learnerIds.length) {
      return cartError(404, LEARNER_UNAVAILABLE_MESSAGES.not_found);
    }

    const unavailable = collectUnavailableLearners(
      learners,
      await getLearnersAvailability(prisma, learners),
    );

    if (unavailable.length > 0) {
      return cartError(409, LEARNERS_UNAVAILABLE_MESSAGE, unavailable);
    }
  }

  const cart = await prisma.sponsorshipCart.create({
    data: {
      ...(input.plan ? { plan: input.plan } : {}),
      items: { create: learnerIds.map((learnerId) => ({ learnerId })) },
    },
    include: cartInclude,
  });

  return { ok: true, data: await serializeCart(prisma, cart) };
};

export const addCartItem = async (
  prisma: PrismaClient,
  cartId: string,
  learnerId: string,
): Promise<CartServiceResult<CartResponse>> => {
  const cart = await findCartForEdit(prisma, cartId);

  if (!cart) {
    return cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  if (!isCartEditable(cart.status)) {
    return lockedCartError(cart.status);
  }

  const existing = await prisma.sponsorshipCartItem.findUnique({
    where: { cartId_learnerId: { cartId, learnerId } },
    select: { id: true },
  });

  if (existing) {
    return cartError(409, CART_DUPLICATE_MESSAGE);
  }

  if (!canAddLearnerToCart(cart._count.items)) {
    return cartError(409, CART_FULL_MESSAGE);
  }

  const availability = await checkLearnerAvailableForSponsorship(prisma, learnerId);

  if (!availability.available) {
    return cartError(availability.reason === "not_found" ? 404 : 409, availability.message);
  }

  let itemId: string;

  try {
    ({ id: itemId } = await prisma.sponsorshipCartItem.create({
      data: { cartId, learnerId },
      select: { id: true },
    }));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return cartError(409, CART_DUPLICATE_MESSAGE);
    }
    throw error;
  }

  // A checkout may have locked the cart, or a parallel add filled it, while this item was written.
  const after = await prisma.sponsorshipCart.findUnique({
    where: { id: cartId },
    select: { status: true, _count: { select: { items: true } } },
  });

  if (!after || !isCartEditable(after.status) || after._count.items > MAX_CART_LEARNERS) {
    await prisma.sponsorshipCartItem.deleteMany({ where: { id: itemId } });

    if (!after) {
      return cartError(404, CART_NOT_FOUND_MESSAGE);
    }

    return isCartEditable(after.status)
      ? cartError(409, CART_FULL_MESSAGE)
      : lockedCartError(after.status);
  }

  return finishEdit(prisma, cartId);
};

/** Removing a learner that is not in the cart is a no-op so retries are safe. */
export const removeCartItem = async (
  prisma: PrismaClient,
  cartId: string,
  learnerId: string,
): Promise<CartServiceResult<CartResponse>> => {
  const cart = await findCartForEdit(prisma, cartId);

  if (!cart) {
    return cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  if (!isCartEditable(cart.status)) {
    return lockedCartError(cart.status);
  }

  await prisma.sponsorshipCartItem.deleteMany({ where: { cartId, learnerId } });

  return finishEdit(prisma, cartId);
};

export const updateCart = async (
  prisma: PrismaClient,
  cartId: string,
  input: UpdateCartInput,
): Promise<CartServiceResult<CartResponse>> => {
  const cart = await findCartForEdit(prisma, cartId);

  if (!cart) {
    return cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  const { count } = await prisma.sponsorshipCart.updateMany({
    where: { id: cartId, status: { in: EDITABLE_STATUSES } },
    data: { plan: input.plan, status: SponsorshipCartStatus.DRAFT },
  });

  if (count === 0) {
    const current = await prisma.sponsorshipCart.findUnique({
      where: { id: cartId },
      select: { status: true },
    });

    return current ? lockedCartError(current.status) : cartError(404, CART_NOT_FOUND_MESSAGE);
  }

  return respondWithCart(prisma, cartId);
};
