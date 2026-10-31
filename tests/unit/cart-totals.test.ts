import { describe, expect, it } from "vitest";
import { MONTHLY_TOTAL, YEARLY_TOTAL } from "@/constants/pricing";
import { computeCartTotals } from "@/lib/sponsorship/cart-totals";

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
