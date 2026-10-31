import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const expenseFindManyMock = vi.fn();
const expenseCreateMock = vi.fn();
const expenseDeleteManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    expense: {
      findMany: expenseFindManyMock,
      create: expenseCreateMock,
      deleteMany: expenseDeleteManyMock,
    },
  }),
}));

describe("admin expense routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("requires the admin secret before listing expenses", async () => {
    const { GET } = await import("../../app/api/admin/expenses/route");
    const response = await GET(new Request("http://localhost/api/admin/expenses"));

    expect(response.status).toBe(401);
    expect(expenseFindManyMock).not.toHaveBeenCalled();
  });

  it("validates and records an expense", async () => {
    const incurredAt = new Date("2026-10-30T00:00:00.000Z");
    expenseCreateMock.mockResolvedValue({
      id: "expense-1",
      category: "STATIONERY",
      amount: 500,
      description: "Notebooks for the pod",
      incurredAt,
      createdAt: new Date("2026-10-30T10:00:00.000Z"),
    });
    const { POST } = await import("../../app/api/admin/expenses/route");
    const response = await POST(
      new Request("http://localhost/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": "test-secret",
        },
        body: JSON.stringify({
          category: "STATIONERY",
          amount: 500,
          description: "Notebooks for the pod",
          incurred_at: "2026-10-30",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(expenseCreateMock).toHaveBeenCalledWith({
      data: {
        category: "STATIONERY",
        amount: 500,
        description: "Notebooks for the pod",
        incurredAt,
      },
    });
  });

  it("rejects invalid expense data before writing", async () => {
    const { POST } = await import("../../app/api/admin/expenses/route");
    const response = await POST(
      new Request("http://localhost/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": "test-secret",
        },
        body: JSON.stringify({
          category: "STATIONERY",
          amount: -50,
          description: "",
          incurred_at: "bad-date",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(expenseCreateMock).not.toHaveBeenCalled();
  });

  it("only deletes valid expense ids after admin authentication", async () => {
    expenseDeleteManyMock.mockResolvedValue({ count: 1 });
    const { DELETE } = await import("../../app/api/admin/expenses/[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/expenses/550e8400-e29b-41d4-a716-446655440010", {
        method: "DELETE",
        headers: { "x-admin-secret": "test-secret" },
      }),
      { params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440010" }) },
    );

    expect(response.status).toBe(200);
    expect(expenseDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440010" },
    });
  });
});
