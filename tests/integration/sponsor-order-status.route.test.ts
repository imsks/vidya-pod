import { beforeEach, describe, expect, it, vi } from "vitest";

const sponsorOrderFindUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      findUnique: sponsorOrderFindUniqueMock,
    },
  }),
}));

describe("GET /api/sponsor/[orderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    sponsorOrderFindUniqueMock.mockResolvedValue({
      orderId: "VP_123_test",
      status: "PENDING",
      plan: "monthly",
      amount: 400,
      learner: {
        name: "Asha Kumar",
        standard: "8",
      },
      sponsor: null,
    });
  });

  it("returns order status with learner info", async () => {
    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_123_test"), {
      params: Promise.resolve({ orderId: "VP_123_test" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      order_id: "VP_123_test",
      status: "PENDING",
      plan: "monthly",
      amount: 400,
      learner: {
        name: "Asha Kumar",
        standard: "8",
      },
      sponsor: null,
    });
  });

  it("returns order status with sponsor info when sponsorship is complete", async () => {
    sponsorOrderFindUniqueMock.mockResolvedValue({
      orderId: "VP_456_test",
      status: "SUCCESS",
      plan: "yearly",
      amount: 4800,
      learner: {
        name: "Ravi Sharma",
        standard: "10",
      },
      sponsor: {
        name: "Priya Patel",
        email: "priya@example.com",
      },
    });

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_456_test"), {
      params: Promise.resolve({ orderId: "VP_456_test" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      order_id: "VP_456_test",
      status: "SUCCESS",
      plan: "yearly",
      amount: 4800,
      learner: {
        name: "Ravi Sharma",
        standard: "10",
      },
      sponsor: {
        name: "Priya Patel",
        email: "priya@example.com",
      },
    });
  });

  it("returns 404 when order is not found", async () => {
    sponsorOrderFindUniqueMock.mockResolvedValue(null);

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/missing"), {
      params: Promise.resolve({ orderId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
