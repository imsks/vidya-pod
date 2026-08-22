import { beforeEach, describe, expect, it, vi } from "vitest";

const sponsorOrderFindUniqueMock = vi.fn();
const syncSponsorOrderFromCashfreeMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      findUnique: sponsorOrderFindUniqueMock,
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
    syncSponsorOrderFromCashfreeMock.mockResolvedValue(false);
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
      .mockResolvedValue({
        orderId: "VP_123_test",
        status: "PENDING",
        plan: "monthly",
        amount: 400,
        learner: {
          name: "Asha Kumar",
          standard: "8",
        },
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
});
