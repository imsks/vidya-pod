import type { SponsorPlanType } from "@/generated/prisma";

const IST_OFFSET_MINUTES = 330;
const MS_PER_MINUTE = 60_000;
const MONTHS_PER_PLAN: Record<SponsorPlanType, number> = {
  monthly: 1,
  yearly: 12,
};

/** Adds whole months, clamping to the last valid day (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (from: Date, months: number): Date => {
  const result = new Date(from.getTime());
  const targetMonth = result.getUTCMonth() + months;
  const dayOfMonth = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(targetMonth);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  return result;
};

export const sponsorshipEndFor = (plan: SponsorPlanType, from: Date): Date =>
  addMonths(from, MONTHS_PER_PLAN[plan]);

/** Formats an instant as the YYYY-MM-DD it falls on in IST, for `<input type="date">`. */
export const toIstDateInput = (date: Date): string => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, 10);
};

/** Converts a YYYY-MM-DD input into the instant that day ends in IST. Null when unparseable. */
export const fromIstDateInput = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const endOfDayUtc = new Date(`${value}T23:59:59.999Z`);

  if (Number.isNaN(endOfDayUtc.getTime())) {
    return null;
  }

  return new Date(endOfDayUtc.getTime() - IST_OFFSET_MINUTES * MS_PER_MINUTE);
};
