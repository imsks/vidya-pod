import { describe, expect, it } from "vitest";
import { PRICING } from "@/constants/pricing";

describe("PRICING", () => {
  it("defines monthly and yearly plans", () => {
    expect(Object.keys(PRICING)).toEqual(["monthly", "yearly"]);
  });

  it("keeps monthly breakdown totaling the plan price", () => {
    const sum = PRICING.monthly.breakdown.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBe(PRICING.monthly.total);
    expect(PRICING.monthly.total).toBe(400);
  });

  it("keeps yearly breakdown totaling the plan price", () => {
    const sum = PRICING.yearly.breakdown.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBe(PRICING.yearly.total);
    expect(PRICING.yearly.total).toBe(4800);
  });

  it("marks yearly as the featured savings plan", () => {
    expect(PRICING.yearly.featured).toBe(true);
    expect(PRICING.yearly.savings).toBe(2400);
    expect(PRICING.monthly.featured).toBe(false);
  });
});
