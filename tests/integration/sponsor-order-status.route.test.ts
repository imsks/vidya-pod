import { beforeEach, describe, expect, it, vi } from "vitest";

const sponsorOrderFindManyMock = vi.fn();
const syncSponsorOrderFromCashfreeMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      findMany: sponsorOrderFindManyMock,
    },
  }),
}));

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: (...args: unknown[]) => syncSponsorOrderFromCashfreeMock(...args),
}));

describe("GET /api/sponsor/[orderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    sponsorOrderFindManyMock.mockResolvedValue([
      {
        status: "PENDING",
        plan: "monthly",
        amount: 400,
        learner: {
          id: "learner-1",
          name: "Asha Kumar",
          standard: "8",
          sponsorshipEndsAt: null,
        },
        sponsor: null,
      },
    ]);
  });

  it("returns order status with learner info", async () => {
    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_123_test"), {
      params: Promise.resolve({ orderId: "VP_123_test" }),
    });

    expect(response.status).toBe(200);
    expect(syncSponsorOrderFromCashfreeMock).toHaveBeenCalledWith(expect.anything(), "VP_123_test");
    expect(sponsorOrderFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { paymentOrderId: "VP_123_test" } }),
    );
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      order_id: "VP_123_test",
      status: "PENDING",
      plan: "monthly",
      amount: 400,
      learners: [{ id: "learner-1", name: "Asha Kumar", standard: "8", sponsored_until: null }],
      sponsor: null,
    });
  });

  it("returns order status with sponsor info when sponsorship is complete", async () => {
    sponsorOrderFindManyMock.mockResolvedValue([
      {
        status: "SUCCESS",
        plan: "yearly",
        amount: 4800,
        learner: {
          id: "learner-2",
          name: "Ravi Sharma",
          standard: "10",
          sponsorshipEndsAt: new Date("2027-11-05T10:00:00.000Z"),
        },
        sponsor: {
          name: "Priya Patel",
          email: "priya@example.com",
        },
      },
    ]);

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
      learners: [
        {
          id: "learner-2",
          name: "Ravi Sharma",
          standard: "10",
          sponsored_until: "2027-11-05T10:00:00.000Z",
        },
      ],
      sponsor: {
        name: "Priya Patel",
      },
    });
    // This endpoint is unauthenticated, so donor contact details must never be returned.
    expect(JSON.stringify(data)).not.toContain("priya@example.com");
  });

  it("returns updated status after Cashfree sync completes the order", async () => {
    syncSponsorOrderFromCashfreeMock.mockResolvedValue(true);
    sponsorOrderFindManyMock.mockReset();
    sponsorOrderFindManyMock
      .mockResolvedValueOnce([
        {
          status: "PENDING",
          plan: "monthly",
          amount: 400,
          learner: {
            name: "Asha Kumar",
            standard: "8",
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          status: "SUCCESS",
          plan: "monthly",
          amount: 400,
          learner: {
            name: "Asha Kumar",
            standard: "8",
          },
        },
      ]);

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_123_test"), {
      params: Promise.resolve({ orderId: "VP_123_test" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.status).toBe("SUCCESS");
  });

  it("lists every learner paid for by one payment and sums the amount", async () => {
    const row = (id: string, name: string) => ({
      status: "SUCCESS",
      plan: "monthly",
      amount: 400,
      learner: { id, name, standard: "5", sponsorshipEndsAt: null },
      sponsor: { name: "Priya Patel" },
    });
    sponsorOrderFindManyMock.mockResolvedValue([row("l-1", "Asha"), row("l-2", "Ravi")]);

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_1_abc"), {
      params: Promise.resolve({ orderId: "VP_1_abc" }),
    });

    const data = await response.json();
    expect(data.data).toMatchObject({
      order_id: "VP_1_abc",
      status: "SUCCESS",
      amount: 800,
      learners: [
        { id: "l-1", name: "Asha", standard: "5", sponsored_until: null },
        { id: "l-2", name: "Ravi", standard: "5", sponsored_until: null },
      ],
    });
    expect(syncSponsorOrderFromCashfreeMock).not.toHaveBeenCalled();
  });

  it("returns 404 when order is not found", async () => {
    sponsorOrderFindManyMock.mockReset();
    sponsorOrderFindManyMock.mockResolvedValue([]);

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/missing"), {
      params: Promise.resolve({ orderId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
