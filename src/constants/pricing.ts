/** The only figure we expect to change — a sponsor's share of the teacher's salary. */
export const TEACHER_SALARY_PER_MONTH = 200;

export const STATIONERY_PER_MONTH = 50;
export const PROCTOR_PER_MONTH = 50;
export const MONTHS_PER_YEAR = 12;

/** Most children a donor can sponsor with one payment. */
export const MAX_LEARNERS_PER_CHECKOUT = 10;

export interface PricingLineItem {
  label: string;
  amount: number;
}

const MONTHLY_BREAKDOWN: PricingLineItem[] = [
  { label: "Teacher Salary", amount: TEACHER_SALARY_PER_MONTH },
  { label: "Stationery", amount: STATIONERY_PER_MONTH },
  { label: "Proctor", amount: PROCTOR_PER_MONTH },
];

const sumBreakdown = (items: PricingLineItem[]) =>
  items.reduce((total, item) => total + item.amount, 0);

const YEARLY_BREAKDOWN: PricingLineItem[] = MONTHLY_BREAKDOWN.map((item) => ({
  label: item.label,
  amount: item.amount * MONTHS_PER_YEAR,
}));

export const MONTHLY_TOTAL = sumBreakdown(MONTHLY_BREAKDOWN);
export const YEARLY_TOTAL = sumBreakdown(YEARLY_BREAKDOWN);

/** What a yearly sponsor saves versus paying monthly for the same period. */
export const YEARLY_SAVINGS = MONTHLY_TOTAL * MONTHS_PER_YEAR - YEARLY_TOTAL;

export const PRICING = {
  monthly: {
    label: "Monthly",
    icon: "📅",
    suffix: "/mo",
    tagline: "Flexible. Cancel anytime. Perfect for starting small.",
    featured: false,
    savings: 0,
    features: [
      "Fund one Student, every month",
      "Monthly impact reports",
      "Direct thank-you notes from Student",
    ],
    breakdown: MONTHLY_BREAKDOWN,
    total: MONTHLY_TOTAL,
  },
  yearly: {
    label: "Yearly",
    icon: "🎓",
    suffix: "/yr",
    tagline: "Gift a full academic year.",
    featured: true,
    savings: YEARLY_SAVINGS,
    features: [
      "Full year of learning for one Student",
      "Named sponsorship (optional)",
      "Year-end documentary + visit invite",
    ],
    breakdown: YEARLY_BREAKDOWN,
    total: YEARLY_TOTAL,
  },
} as const;

export type PlanType = keyof typeof PRICING;
