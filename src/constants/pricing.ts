export const PRICING = {
  monthly: {
    breakdown: [
      { label: "Teacher Salary", amount: 2000 },
      { label: "Proctor Fee", amount: 500 },
      { label: "Stationery", amount: 500 },
      { label: "Books & Materials", amount: 500 },
      { label: "Miscellaneous", amount: 500 },
    ],
    total: 4000,
  },
  yearly: {
    breakdown: [
      { label: "Teacher Salary", amount: 24000 },
      { label: "Proctor Fee", amount: 6000 },
      { label: "Stationery", amount: 4000 },
      { label: "Books & Materials", amount: 4000 },
      { label: "Miscellaneous", amount: 4000 },
    ],
    total: 42000,
  },
} as const;

export type PlanType = keyof typeof PRICING;
