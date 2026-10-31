import "server-only";

import type { ExpenseCategory, PrismaClient } from "@/generated/prisma";

export const RECENT_EXPENSE_LIMIT = 30;

export type TransparencyCategoryTotal = {
  category: ExpenseCategory;
  amount: number;
};

export type TransparencyExpense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  incurred_at: string;
};

export type TransparencySummary = {
  received: number;
  spent: number;
  category_totals: TransparencyCategoryTotal[];
  recent_expenses: TransparencyExpense[];
  supporters: { id: string; name: string }[];
  recent_expense_limit: number;
};

/** Returns only publicly disclosable fields — never donor contact details or individual amounts. */
export const getTransparencySummary = async (
  prisma: PrismaClient,
): Promise<TransparencySummary> => {
  const [donations, categoryTotals, recentExpenses, supporters] = await Promise.all([
    prisma.sponsorOrder.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      select: {
        id: true,
        category: true,
        amount: true,
        description: true,
        incurredAt: true,
      },
      orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
      take: RECENT_EXPENSE_LIMIT,
    }),
    prisma.sponsor.findMany({
      where: {
        showPublicly: true,
        orders: { some: { status: "SUCCESS" } },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totals = categoryTotals.map((item) => ({
    category: item.category,
    amount: item._sum.amount ?? 0,
  }));

  return {
    received: donations._sum.amount ?? 0,
    spent: totals.reduce((total, item) => total + item.amount, 0),
    category_totals: totals,
    recent_expenses: recentExpenses.map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      incurred_at: expense.incurredAt.toISOString().slice(0, 10),
    })),
    supporters,
    recent_expense_limit: RECENT_EXPENSE_LIMIT,
  };
};
