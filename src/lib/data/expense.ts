import "server-only";

import type { Expense, ExpenseCategory, PrismaClient } from "@/generated/prisma";

export type CreateExpenseInput = {
  category: ExpenseCategory;
  amount: number;
  description: string;
  incurredAt: Date;
};

export const listExpenses = (prisma: PrismaClient): Promise<Expense[]> =>
  prisma.expense.findMany({ orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }] });

export const createExpense = (prisma: PrismaClient, input: CreateExpenseInput): Promise<Expense> =>
  prisma.expense.create({ data: input });

export const deleteExpense = async (prisma: PrismaClient, id: string): Promise<boolean> => {
  const result = await prisma.expense.deleteMany({ where: { id } });
  return result.count > 0;
};
