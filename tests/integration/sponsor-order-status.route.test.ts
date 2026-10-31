import { beforeEach, describe, expect, it, vi } from "vitest";

const sponsorOrderFindUniqueMock = vi.fn();
const sponsorOrderFindManyMock = vi.fn();
const syncSponsorOrderFromCashfreeMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      findUnique: sponsorOrderFindUniqueMock,
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
    sponsorOrderFindUniqueMock.mockResolvedValue({
      orderId: "VP_123_test",
      status: "PENDING",
      plan: "monthly",
      amount: 400,
      learner: {
        name: "Asha Kumar",
        standard: "8",
        sponsorshipEndsAt: null,
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
    expect(syncSponsorOrderFromCashfreeMock).toHaveBeenCalledWith(expect.anything(), "VP_123_test");
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
      sponsored_until: null,
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
        sponsorshipEndsAt: new Date("2027-11-05T10:00:00.000Z"),
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
      sponsored_until: "2027-11-05T10:00:00.000Z",
      sponsor: {
        name: "Priya Patel",
        email: "priya@example.com",
      },
    });
  });

  it("returns updated status after Cashfree sync completes the order", async () => {
    syncSponsorOrderFromCashfreeMock.mockResolvedValue(true);
    sponsorOrderFindUniqueMock.mockReset();
    sponsorOrderFindUniqueMock
      .mockResolvedValueOnce({
        orderId: "VP_123_test",
        status: "PENDING",
        plan: "monthly",
        amount: 400,
        learner: {
          name: "Asha Kumar",
          standard: "8",
        },
      })
      .mockResolvedValueOnce({
        orderId: "VP_123_test",
        status: "SUCCESS",
        plan: "monthly",
        amount: 400,
        shareSlug: "abcdefghijklmnop",
        learner: {
          name: "Asha Kumar",
          standard: "8",
        },
      });

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/VP_123_test"), {
      params: Promise.resolve({ orderId: "VP_123_test" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.status).toBe("SUCCESS");
  });

  it("returns 404 when order is not found", async () => {
    sponsorOrderFindUniqueMock.mockReset();
    sponsorOrderFindUniqueMock.mockResolvedValue(null);

    const { GET } = await import("../../app/api/sponsor/[orderId]/route");
    const response = await GET(new Request("http://localhost/api/sponsor/missing"), {
      params: Promise.resolve({ orderId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  describe("for a payment covering several learners", () => {
    const cartRow = (name: string, status: string, endsAt: Date | null = null) => ({
      status,
      plan: "monthly",
      amount: 300,
      learner: { name, standard: "5", sponsorshipEndsAt: endsAt },
      sponsor: status === "SUCCESS" ? { name: "Priya Patel", email: "priya@example.com" } : null,
    });
    const endsAt = new Date("2026-12-01T10:00:00.000Z");

    const getStatus = async (orderId = "VPC_123_test") => {
      const { GET } = await import("../../app/api/sponsor/[orderId]/route");
      return GET(new Request(`http://localhost/api/sponsor/${orderId}`), {
        params: Promise.resolve({ orderId }),
      });
    };

    it("reports every learner and the combined amount once Cashfree confirms payment", async () => {
      syncSponsorOrderFromCashfreeMock.mockResolvedValue(true);
      sponsorOrderFindManyMock
        .mockResolvedValueOnce([cartRow("Asha", "PENDING"), cartRow("Ravi", "PENDING")])
        .mockResolvedValueOnce([
          cartRow("Asha", "SUCCESS", endsAt),
          cartRow("Ravi", "SUCCESS", endsAt),
        ]);

      const response = await getStatus();

      expect(response.status).toBe(200);
      expect(syncSponsorOrderFromCashfreeMock).toHaveBeenCalledWith(
        expect.anything(),
        "VPC_123_test",
      );
      expect(sponsorOrderFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paymentOrderId: "VPC_123_test" } }),
      );
      expect(sponsorOrderFindUniqueMock).not.toHaveBeenCalled();
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        data: {
          order_id: "VPC_123_test",
          status: "SUCCESS",
          plan: "monthly",
          amount: 600,
          learner: null,
          learners: [
            { name: "Asha", standard: "5", sponsored_until: endsAt.toISOString() },
            { name: "Ravi", standard: "5", sponsored_until: endsAt.toISOString() },
          ],
          sponsored_until: null,
          sponsor: { name: "Priya Patel", email: "priya@example.com" },
        },
      });
    });

    it("does not reconcile a payment that is already settled", async () => {
      sponsorOrderFindManyMock.mockResolvedValue([
        cartRow("Asha", "FAILED"),
        cartRow("Ravi", "FAILED"),
      ]);

      const response = await getStatus();

      expect(syncSponsorOrderFromCashfreeMock).not.toHaveBeenCalled();
      const data = await response.json();
      expect(data.data).toMatchObject({ status: "FAILED", sponsor: null });
    });

    it("returns 404 for an unknown payment", async () => {
      sponsorOrderFindManyMock.mockResolvedValue([]);

      const response = await getStatus("VPC_999_missing");

      expect(response.status).toBe(404);
      expect(sponsorOrderFindUniqueMock).not.toHaveBeenCalled();
    });
  });
});
