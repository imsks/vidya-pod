import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/constants/expenses";

const isValidDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().int().positive().max(2_147_483_647),
  description: z.string().trim().min(1, "Description is required").max(500),
  incurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid expense date")
    .refine(isValidDate, "Enter a valid expense date"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const parseExpenseBody = (body: unknown) => {
  const result = expenseSchema.safeParse(body);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues[0]?.message ?? "Invalid expense",
    };
  }
  return { success: true as const, data: result.data };
};
