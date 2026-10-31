import { describe, expect, it } from "vitest";
import { MONTHLY_TOTAL, YEARLY_TOTAL } from "@/constants/pricing";
import {
  CART_FULL_MESSAGE,
  MAX_CART_LEARNERS,
  MIN_CART_LEARNERS,
  canAddLearnerToCart,
  computeCartTotals,
  formatLearnerCount,
  validateCartAmount,
  validateCartLearnerCount,
} from "@/lib/sponsorship/cart-totals";

describe("computeCartTotals", () => {
  it("multiplies the monthly plan price by the number of learners", () => {
    expect(computeCartTotals("monthly", 3)).toEqual({
      plan: "monthly",
      learnerCount: 3,
      unitAmount: MONTHLY_TOTAL,
      total: MONTHLY_TOTAL * 3,
    });
  });

  it("multiplies the yearly plan price by the number of learners", () => {
    expect(computeCartTotals("yearly", 2)).toEqual({
      plan: "yearly",
      learnerCount: 2,
      unitAmount: YEARLY_TOTAL,
      total: YEARLY_TOTAL * 2,
    });
  });

  it("returns a zero total for an empty cart", () => {
    expect(computeCartTotals("monthly", 0).total).toBe(0);
  });

  it("never produces a negative or fractional count", () => {
    expect(computeCartTotals("monthly", -2)).toMatchObject({ learnerCount: 0, total: 0 });
    expect(computeCartTotals("monthly", 2.7)).toMatchObject({
      learnerCount: 2,
      total: MONTHLY_TOTAL * 2,
    });
  });
});

describe("cart limits", () => {
  it("allows between one and ten learners per checkout", () => {
    expect(MIN_CART_LEARNERS).toBe(1);
    expect(MAX_CART_LEARNERS).toBe(10);
  });

  it("rejects checking out an empty cart", () => {
    expect(validateCartLearnerCount(0)).toBe(
      "Add at least one learner to your cart before checking out.",
    );
  });

  it("rejects more learners than the limit", () => {
    expect(validateCartLearnerCount(MAX_CART_LEARNERS + 1)).toBe(CART_FULL_MESSAGE);
    expect(CART_FULL_MESSAGE).toBe("You can sponsor up to 10 learners in one checkout.");
  });

  it("accepts counts within the limits", () => {
    expect(validateCartLearnerCount(MIN_CART_LEARNERS)).toBeNull();
    expect(validateCartLearnerCount(MAX_CART_LEARNERS)).toBeNull();
  });

  it("only lets learners be added while the cart has room", () => {
    expect(canAddLearnerToCart(MAX_CART_LEARNERS - 1)).toBe(true);
    expect(canAddLearnerToCart(MAX_CART_LEARNERS)).toBe(false);
  });
});

describe("validateCartAmount", () => {
  it("accepts the server-computed total", () => {
    expect(validateCartAmount("monthly", 3, MONTHLY_TOTAL * 3)).toBeNull();
    expect(validateCartAmount("yearly", 2, YEARLY_TOTAL * 2)).toBeNull();
  });

  it("explains the expected amount when the client total is stale", () => {
    expect(validateCartAmount("monthly", 3, MONTHLY_TOTAL * 2)).toBe(
      `Amount must be ${MONTHLY_TOTAL * 3} for 3 learners on the monthly plan`,
    );
    expect(validateCartAmount("yearly", 1, MONTHLY_TOTAL)).toBe(
      `Amount must be ${YEARLY_TOTAL} for 1 learner on the yearly plan`,
    );
  });
});

describe("formatLearnerCount", () => {
  it("pluralises learner counts", () => {
    expect(formatLearnerCount(1)).toBe("1 learner");
    expect(formatLearnerCount(0)).toBe("0 learners");
    expect(formatLearnerCount(4)).toBe("4 learners");
  });
});
