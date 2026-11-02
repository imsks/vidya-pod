import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { getTransparencySummary, RECENT_EXPENSE_LIMIT } from "@/lib/data/transparency";

const buildPrisma = (overrides: {
  received?: number | null;
  categoryTotals?: { category: string; _sum: { amount: number | null } }[];
  recentExpenses?: unknown[];
  supporters?: { id: string; name: string }[];
}) =>
  ({
    sponsorOrder: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: overrides.received ?? null } }),
    },
    expense: {
      groupBy: vi.fn().mockResolvedValue(overrides.categoryTotals ?? []),
      findMany: vi.fn().mockResolvedValue(overrides.recentExpenses ?? []),
    },
    sponsor: {
      findMany: vi.fn().mockResolvedValue(overrides.supporters ?? []),
    },
  }) as unknown as PrismaClient;

describe("getTransparencySummary", () => {
  it("totals received and spent amounts", async () => {
    const prisma = buildPrisma({
      received: 9600,
      categoryTotals: [
        { category: "STATIONERY", _sum: { amount: 500 } },
        { category: "TEACHER_FEE", _sum: { amount: 4000 } },
      ],
      recentExpenses: [
        {
          id: "expense-1",
          category: "STATIONERY",
          amount: 500,
          description: "Notebooks",
          incurredAt: new Date("2026-10-30T00:00:00.000Z"),
        },
      ],
      supporters: [{ id: "sponsor-1", name: "Priya Patel" }],
    });

    const summary = await getTransparencySummary(prisma);

    expect(summary.received).toBe(9600);
    expect(summary.spent).toBe(4500);
    expect(summary.category_totals).toEqual([
      { category: "STATIONERY", amount: 500 },
      { category: "TEACHER_FEE", amount: 4000 },
    ]);
    expect(summary.recent_expenses).toEqual([
      {
        id: "expense-1",
        category: "STATIONERY",
        amount: 500,
        description: "Notebooks",
        incurred_at: "2026-10-30",
      },
    ]);
    expect(summary.supporters).toEqual([{ id: "sponsor-1", name: "Priya Patel" }]);
    expect(summary.recent_expense_limit).toBe(RECENT_EXPENSE_LIMIT);
  });

  it("reports zeroes when nothing has been recorded", async () => {
    const summary = await getTransparencySummary(buildPrisma({}));

    expect(summary.received).toBe(0);
    expect(summary.spent).toBe(0);
    expect(summary.category_totals).toEqual([]);
    expect(summary.recent_expenses).toEqual([]);
    expect(summary.supporters).toEqual([]);
  });

  it("only queries sponsors who opted into public acknowledgement", async () => {
    const prisma = buildPrisma({});
    await getTransparencySummary(prisma);

    expect(prisma.sponsor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ showPublicly: true }),
        select: { id: true, name: true },
      }),
    );
  });

  it("never selects donor contact details or per-donation amounts", async () => {
    const prisma = buildPrisma({});
    await getTransparencySummary(prisma);

    const queries = JSON.stringify([
      (prisma.sponsor.findMany as ReturnType<typeof vi.fn>).mock.calls,
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(queries).not.toContain("email");
    expect(queries).not.toContain("phone");
  });
});
