export const PRICING = {
  monthly: {
    label: "Monthly",
    icon: "📅",
    suffix: "/mo",
    tagline: "Flexible. Cancel anytime. Perfect for starting small.",
    featured: false,
    savings: null,
    features: [
      "Fund one Student, every month",
      "Monthly impact reports",
      "Direct thank-you notes from Student",
    ],
    breakdown: [
      { label: "Teacher Salary", amount: 200 },
      { label: "Stationery", amount: 50 },
      { label: "Proctor", amount: 50 },
    ],
    total: 300,
  },
  yearly: {
    label: "Yearly",
    icon: "🎓",
    suffix: "/yr",
    tagline: "Gift a full academic year.",
    featured: true,
    savings: null,
    features: [
      "Full year of learning for one Student",
      "Named sponsorship (optional)",
      "Year-end documentary + visit invite",
    ],
    breakdown: [
      { label: "Teacher Salary", amount: 2400 },
      { label: "Stationery", amount: 600 },
      { label: "Proctor", amount: 600 },
    ],
    total: 3600,
  },
} as const;

export type PlanType = keyof typeof PRICING;
