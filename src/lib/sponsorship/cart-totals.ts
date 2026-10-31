import { PRICING, type PlanType } from "@/constants/pricing";

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
