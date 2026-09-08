import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchCashfreeOrderMock = vi.fn();
const fetchCashfreePaymentsForOrderMock = vi.fn();
const completeSponsorshipPaymentMock = vi.fn();
const failSponsorshipPaymentMock = vi.fn();
const sponsorOrderFindUniqueMock = vi.fn();

vi.mock("@/lib/cashfree/config", () => ({
  isCashfreeConfigured: () => true,
}));

vi.mock("@/lib/cashfree/fetch-order", () => ({
  fetchCashfreeOrder: (...args: unknown[]) => fetchCashfreeOrderMock(...args),
  fetchCashfreePaymentsForOrder: (...args: unknown[]) => fetchCashfreePaymentsForOrderMock(...args),
  hasSuccessfulCashfreePayment: (payments: { payment_status?: string }[]) =>
    payments.some((payment) => payment.payment_status?.toUpperCase() === "SUCCESS"),
  hasTerminalFailedCashfreePayment: (payments: { payment_status?: string }[]) =>
    payments.some((payment) => {
      const status = payment.payment_status?.toUpperCase() ?? "";
      return status === "FAILED" || status === "USER_DROPPED" || status === "CANCELLED";
    }),
  isCashfreeOrderPaid: (order: { order_status?: string }) =>
    order.order_status?.toUpperCase() === "PAID",
  isCashfreeOrderTerminalFailure: (order: { order_status?: string }) => {
    const status = order.order_status?.toUpperCase() ?? "";
    return status === "EXPIRED" || status === "TERMINATED";
  },
}));

vi.mock("@/lib/sponsorship/complete-sponsorship", () => ({
  completeSponsorshipPayment: (...args: unknown[]) => completeSponsorshipPaymentMock(...args),
  failSponsorshipPayment: (...args: unknown[]) => failSponsorshipPaymentMock(...args),
}));

describe("syncSponsorOrderFromCashfree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sponsorOrderFindUniqueMock.mockResolvedValue({ status: "PENDING" });
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VP_123", order_status: "PAID" });
    fetchCashfreePaymentsForOrderMock.mockResolvedValue([]);
    completeSponsorshipPaymentMock.mockResolvedValue({
      success: true,
      alreadyCompleted: false,
      order: { status: "SUCCESS" },
    });
    failSponsorshipPaymentMock.mockResolvedValue({
      success: true,
      alreadyCompleted: false,
      order: { status: "FAILED" },
    });
  });

  it("completes a pending order when Cashfree reports PAID", async () => {
    const prisma = {
      sponsorOrder: { findUnique: sponsorOrderFindUniqueMock },
    };

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VP_123");

    expect(updated).toBe(true);
    expect(completeSponsorshipPaymentMock).toHaveBeenCalledWith(prisma, "VP_123");
  });

  it("skips sync when the local order is not pending", async () => {
    sponsorOrderFindUniqueMock.mockResolvedValue({ status: "SUCCESS" });

    const prisma = {
      sponsorOrder: { findUnique: sponsorOrderFindUniqueMock },
    };

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VP_123");

    expect(updated).toBe(false);
    expect(fetchCashfreeOrderMock).not.toHaveBeenCalled();
  });

  it("checks payments when the order is still ACTIVE", async () => {
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VP_123", order_status: "ACTIVE" });
    fetchCashfreePaymentsForOrderMock.mockResolvedValue([{ payment_status: "SUCCESS" }]);

    const prisma = {
      sponsorOrder: { findUnique: sponsorOrderFindUniqueMock },
    };

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VP_123");

    expect(updated).toBe(true);
    expect(fetchCashfreePaymentsForOrderMock).toHaveBeenCalledWith("VP_123");
    expect(completeSponsorshipPaymentMock).toHaveBeenCalledWith(prisma, "VP_123");
  });

  it("marks the order failed when Cashfree reports EXPIRED", async () => {
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VP_123", order_status: "EXPIRED" });

    const prisma = {
      sponsorOrder: { findUnique: sponsorOrderFindUniqueMock },
    };

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VP_123");

    expect(updated).toBe(true);
    expect(failSponsorshipPaymentMock).toHaveBeenCalledWith(prisma, "VP_123");
  });
});
