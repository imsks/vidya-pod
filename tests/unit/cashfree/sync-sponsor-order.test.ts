import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchCashfreeOrderMock = vi.fn();
const fetchCashfreePaymentsForOrderMock = vi.fn();
const completeSponsorshipPaymentMock = vi.fn();
const failSponsorshipPaymentMock = vi.fn();
const sponsorOrderFindUniqueMock = vi.fn();
const completeCartPaymentMock = vi.fn();
const failCartPaymentMock = vi.fn();
const sponsorOrderCountMock = vi.fn();

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

vi.mock("@/lib/sponsorship/complete-cart", () => ({
  completeCartPayment: (...args: unknown[]) => completeCartPaymentMock(...args),
  failCartPayment: (...args: unknown[]) => failCartPaymentMock(...args),
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

describe("syncSponsorOrderFromCashfree for a multi-learner cart payment", () => {
  const prisma = {
    sponsorOrder: { findUnique: sponsorOrderFindUniqueMock, count: sponsorOrderCountMock },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sponsorOrderCountMock.mockResolvedValue(2);
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VPC_1_abc", order_status: "PAID" });
    fetchCashfreePaymentsForOrderMock.mockResolvedValue([]);
    completeCartPaymentMock.mockResolvedValue({ success: true, alreadyCompleted: false });
    failCartPaymentMock.mockResolvedValue({ success: true, alreadyCompleted: false });
  });

  it("settles every learner of the payment when Cashfree reports PAID", async () => {
    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VPC_1_abc");

    expect(updated).toBe(true);
    expect(sponsorOrderCountMock).toHaveBeenCalledWith({
      where: { paymentOrderId: "VPC_1_abc", status: { in: ["PENDING", "EXPIRED"] } },
    });
    expect(fetchCashfreeOrderMock).toHaveBeenCalledWith("VPC_1_abc");
    expect(completeCartPaymentMock).toHaveBeenCalledWith(prisma, "VPC_1_abc");
    expect(completeSponsorshipPaymentMock).not.toHaveBeenCalled();
    expect(sponsorOrderFindUniqueMock).not.toHaveBeenCalled();
  });

  it("skips sync once every learner of the payment is settled", async () => {
    sponsorOrderCountMock.mockResolvedValue(0);

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VPC_1_abc");

    expect(updated).toBe(false);
    expect(fetchCashfreeOrderMock).not.toHaveBeenCalled();
  });

  it("releases every learner when the combined order expired", async () => {
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VPC_1_abc", order_status: "EXPIRED" });

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VPC_1_abc");

    expect(updated).toBe(true);
    expect(failCartPaymentMock).toHaveBeenCalledWith(prisma, "VPC_1_abc");
    expect(failSponsorshipPaymentMock).not.toHaveBeenCalled();
  });

  it("settles from a successful payment while the order is still ACTIVE", async () => {
    fetchCashfreeOrderMock.mockResolvedValue({ order_id: "VPC_1_abc", order_status: "ACTIVE" });
    fetchCashfreePaymentsForOrderMock.mockResolvedValue([{ payment_status: "SUCCESS" }]);

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VPC_1_abc");

    expect(updated).toBe(true);
    expect(completeCartPaymentMock).toHaveBeenCalledWith(prisma, "VPC_1_abc");
  });

  it("reports no change when a webhook already settled the payment", async () => {
    completeCartPaymentMock.mockResolvedValue({ success: true, alreadyCompleted: true });

    const { syncSponsorOrderFromCashfree } = await import("@/lib/cashfree/sync-sponsor-order");
    const updated = await syncSponsorOrderFromCashfree(prisma as never, "VPC_1_abc");

    expect(updated).toBe(false);
  });
});
