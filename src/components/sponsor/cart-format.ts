import type { PlanType } from "@/constants/pricing";

export const formatChildCount = (count: number): string =>
  `${count} ${count === 1 ? "child" : "children"}`;

export const formatRupees = (amount: number): string => `₹${amount.toLocaleString("en-IN")}`;

export const planPeriod = (plan: PlanType | string): string => (plan === "yearly" ? "yr" : "mo");

const MAX_NAMED_CHILDREN = 3;

/** "Asha", "Asha and Ravi", "Asha, Ravi and Meera", or "5 children" for longer lists. */
export const describeChildren = (names: string[]): string => {
  if (names.length === 0 || names.length > MAX_NAMED_CHILDREN) {
    return formatChildCount(names.length);
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};
