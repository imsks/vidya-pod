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
      { label: "Teacher Salary", amount: 250 },
      { label: "Proctor Fee", amount: 50 },
      { label: "Stationery", amount: 50 },
      { label: "Miscellaneous", amount: 50 },
    ],
    total: 400,
  },
  yearly: {
    label: "Yearly",
    icon: "🎓",
    suffix: "/yr",
    tagline: "Save ₹2,400. Gift a full academic year.",
    featured: true,
    savings: 2400,
    features: [
      "Full year of learning for one Student",
      "Named sponsorship (optional)",
      "Year-end documentary + visit invite",
    ],
    breakdown: [
      { label: "Teacher Salary", amount: 3000 },
      { label: "Proctor Fee", amount: 600 },
      { label: "Stationery", amount: 600 },
      { label: "Miscellaneous", amount: 600 },
    ],
    total: 4800,
  },
} as const;

export type PlanType = keyof typeof PRICING;
