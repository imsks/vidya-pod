import { PRICING, type PlanType } from "@/constants/pricing";

/** Fewest learners a cart can check out with. */
export const MIN_CART_LEARNERS = 1;
/** Most learners a donor can sponsor in one checkout. */
export const MAX_CART_LEARNERS = 10;

export interface CartTotals {
  plan: PlanType;
  learnerCount: number;
  /** What one learner costs on the plan; also the amount recorded on each learner's order. */
  unitAmount: number;
  total: number;
}

/** Every learner in a cart is sponsored on the same plan, so the total is the plan price × count. */
export const computeCartTotals = (plan: PlanType, learnerCount: number): CartTotals => {
  const unitAmount = PRICING[plan].total;
  const count = Math.max(0, Math.trunc(learnerCount));

  return {
    plan,
    learnerCount: count,
    unitAmount,
    total: unitAmount * count,
  };
};

export const formatLearnerCount = (count: number): string =>
  `${count} ${count === 1 ? "learner" : "learners"}`;

export const canAddLearnerToCart = (currentCount: number): boolean =>
  currentCount < MAX_CART_LEARNERS;

export const CART_FULL_MESSAGE = `You can sponsor up to ${MAX_CART_LEARNERS} learners in one checkout.`;

/** Null when the cart may check out with this many learners, otherwise why it may not. */
export const validateCartLearnerCount = (count: number): string | null => {
  if (count < MIN_CART_LEARNERS) {
    return "Add at least one learner to your cart before checking out.";
  }

  if (count > MAX_CART_LEARNERS) {
    return CART_FULL_MESSAGE;
  }

  return null;
};

/** Null when the amount the donor saw matches the server total, otherwise the expected amount. */
export const validateCartAmount = (
  plan: PlanType,
  learnerCount: number,
  amount: number,
): string | null => {
  const { total } = computeCartTotals(plan, learnerCount);

  if (amount !== total) {
    return `Amount must be ${total} for ${formatLearnerCount(learnerCount)} on the ${plan} plan`;
  }

  return null;
};
