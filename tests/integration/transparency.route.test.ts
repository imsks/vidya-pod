import { beforeEach, describe, expect, it, vi } from "vitest";

const sponsorOrderAggregateMock = vi.fn();
const expenseGroupByMock = vi.fn();
const expenseFindManyMock = vi.fn();
const sponsorFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: { aggregate: sponsorOrderAggregateMock },
    expense: { groupBy: expenseGroupByMock, findMany: expenseFindManyMock },
    sponsor: { findMany: sponsorFindManyMock },
  }),
}));

describe("GET /api/transparency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    sponsorOrderAggregateMock.mockResolvedValue({ _sum: { amount: 9600 } });
    expenseGroupByMock.mockResolvedValue([{ category: "STATIONERY", _sum: { amount: 500 } }]);
    expenseFindManyMock.mockResolvedValue([
      {
        id: "expense-1",
        category: "STATIONERY",
        amount: 500,
        description: "Notebooks",
        incurredAt: new Date("2026-10-30T00:00:00.000Z"),
      },
    ]);
    sponsorFindManyMock.mockResolvedValue([{ id: "sponsor-1", name: "Priya Patel" }]);
  });

  it("returns the public funding summary without authentication", async () => {
    const { GET } = await import("../../app/api/transparency/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.received).toBe(9600);
    expect(data.spent).toBe(500);
    expect(data.recent_expenses).toHaveLength(1);
    expect(data.supporters).toEqual([{ id: "sponsor-1", name: "Priya Patel" }]);
  });

  it("returns zeroes when nothing has been recorded", async () => {
    sponsorOrderAggregateMock.mockResolvedValue({ _sum: { amount: null } });
    expenseGroupByMock.mockResolvedValue([]);
    expenseFindManyMock.mockResolvedValue([]);
    sponsorFindManyMock.mockResolvedValue([]);

    const { GET } = await import("../../app/api/transparency/route");
    const data = await (await GET()).json();

    expect(data).toMatchObject({
      received: 0,
      spent: 0,
      category_totals: [],
      recent_expenses: [],
      supporters: [],
    });
  });

  it("returns a generic 500 without leaking the underlying error", async () => {
    expenseGroupByMock.mockRejectedValueOnce(new Error("db down"));

    const { GET } = await import("../../app/api/transparency/route");
    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to load figures" });
  });
});
