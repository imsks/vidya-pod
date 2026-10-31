import type { ExpenseCategory } from "@/constants/expenses";

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

export type TransparencySupporter = {
  id: string;
  name: string;
};

export type TransparencyResponse = {
  received: number;
  spent: number;
  category_totals: TransparencyCategoryTotal[];
  recent_expenses: TransparencyExpense[];
  supporters: TransparencySupporter[];
  recent_expense_limit: number;
};
