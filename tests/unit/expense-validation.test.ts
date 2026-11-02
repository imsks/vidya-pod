import { describe, expect, it } from "vitest";
import { parseExpenseBody } from "@/lib/validation/expense";

const validExpense = {
  category: "STATIONERY",
  amount: 500,
  description: "Notebooks for the pod",
  incurred_at: "2026-10-30",
};

describe("parseExpenseBody", () => {
  it("accepts a complete expense record", () => {
    expect(parseExpenseBody(validExpense)).toEqual({
      success: true,
      data: validExpense,
    });
  });

  it.each([
    { ...validExpense, amount: 0 },
    { ...validExpense, amount: 10.5 },
    { ...validExpense, category: "DONATION" },
    { ...validExpense, description: " " },
    { ...validExpense, incurred_at: "2026-02-30" },
  ])("rejects invalid expense data: %o", (expense) => {
    expect(parseExpenseBody(expense).success).toBe(false);
  });
});
