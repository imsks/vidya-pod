export const EXPENSE_CATEGORIES = [
  "TEACHER_FEE",
  "STUDENT_FEES",
  "STATIONERY",
  "PROCTOR_FEE",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TEACHER_FEE: "Teacher fees",
  STUDENT_FEES: "Student fees",
  STATIONERY: "Stationery",
  PROCTOR_FEE: "Proctor fees",
  OTHER: "Other",
};
