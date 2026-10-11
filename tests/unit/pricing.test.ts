import { describe, expect, it } from "vitest";
import {
  MONTHS_PER_YEAR,
  PRICING,
  PROCTOR_PER_MONTH,
  STATIONERY_PER_MONTH,
  TEACHER_SALARY_PER_MONTH,
} from "@/constants/pricing";

describe("PRICING", () => {
  it("defines monthly and yearly plans", () => {
    expect(Object.keys(PRICING)).toEqual(["monthly", "yearly"]);
  });

  it("derives the monthly total from the teacher salary plus fixed costs", () => {
    const sum = PRICING.monthly.breakdown.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBe(PRICING.monthly.total);
    expect(PRICING.monthly.total).toBe(
      TEACHER_SALARY_PER_MONTH + STATIONERY_PER_MONTH + PROCTOR_PER_MONTH,
    );
  });

  it("scales the yearly plan from the monthly plan", () => {
    const sum = PRICING.yearly.breakdown.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBe(PRICING.yearly.total);
    expect(PRICING.yearly.total).toBe(PRICING.monthly.total * MONTHS_PER_YEAR);
    PRICING.yearly.breakdown.forEach((item, index) => {
      expect(item.label).toBe(PRICING.monthly.breakdown[index].label);
      expect(item.amount).toBe(PRICING.monthly.breakdown[index].amount * MONTHS_PER_YEAR);
    });
  });

  it("marks yearly as the featured plan with consistent savings", () => {
    expect(PRICING.yearly.featured).toBe(true);
    expect(PRICING.monthly.featured).toBe(false);
    expect(PRICING.yearly.savings).toBe(
      PRICING.monthly.total * MONTHS_PER_YEAR - PRICING.yearly.total,
    );
  });
});
