import { describe, expect, it, vi } from "vitest";
import { SponsorOrderStatus } from "@/generated/prisma";
import {
  completeSponsorshipPayment,
  failSponsorshipPayment,
  getOrderIdFromWebhookPayload,
  isPaymentFailedWebhook,
  isPaymentSuccessWebhook,
} from "@/lib/sponsorship/complete-sponsorship";

describe("completeSponsorshipPayment", () => {
  it("returns order_not_found when order does not exist", async () => {
    const prisma = {
      sponsorOrder: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await completeSponsorshipPayment(prisma as never, "VP_missing");
    expect(result).toEqual({ success: false, reason: "order_not_found" });
  });

  it("returns already completed for SUCCESS orders", async () => {
    const order = {
      id: "order-1",
      orderId: "VP_123",
      status: SponsorOrderStatus.SUCCESS,
    };

    const prisma = {
      sponsorOrder: {
        findUnique: vi.fn().mockResolvedValue(order),
      },
    };

    const result = await completeSponsorshipPayment(prisma as never, "VP_123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.alreadyCompleted).toBe(true);
    }
  });

  it("creates sponsor and assigns learner on pending order", async () => {
    const order = {
      id: "order-1",
      orderId: "VP_123",
      status: SponsorOrderStatus.PENDING,
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      learnerId: "learner-1",
    };

    const updatedOrder = { ...order, status: SponsorOrderStatus.SUCCESS, sponsorId: "sponsor-1" };

    const sponsorCreate = vi.fn().mockResolvedValue({ id: "sponsor-1" });
    const sponsorFindFirst = vi.fn().mockResolvedValue(null);
    const sponsorOrderUpdate = vi.fn().mockResolvedValue(updatedOrder);
    const learnerFindUnique = vi.fn().mockResolvedValue({ sponsorId: null });
    const learnerUpdate = vi.fn().mockResolvedValue({});

    const prisma = {
      sponsorOrder: {
        findUnique: vi.fn().mockResolvedValue(order),
      },
      $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          sponsor: {
            findFirst: sponsorFindFirst,
            create: sponsorCreate,
          },
          sponsorOrder: {
            update: sponsorOrderUpdate,
          },
          learner: {
            findUnique: learnerFindUnique,
            update: learnerUpdate,
          },
        }),
      ),
    };

    const result = await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(result.success).toBe(true);
    expect(sponsorCreate).toHaveBeenCalledWith({
      data: {
        name: "Donor",
        email: "donor@example.com",
        phone: "9999999999",
      },
    });
    expect(learnerUpdate).toHaveBeenCalledWith({
      where: { id: "learner-1" },
      data: { sponsorId: "sponsor-1" },
    });
  });
});

describe("failSponsorshipPayment", () => {
  it("marks pending order as failed", async () => {
    const order = {
      id: "order-1",
      orderId: "VP_123",
      status: SponsorOrderStatus.PENDING,
    };

    const updatedOrder = { ...order, status: SponsorOrderStatus.FAILED };

    const prisma = {
      sponsorOrder: {
        findUnique: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue(updatedOrder),
      },
    };

    const result = await failSponsorshipPayment(prisma as never, "VP_123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.order.status).toBe(SponsorOrderStatus.FAILED);
    }
  });
});

describe("webhook payload helpers", () => {
  it("extracts order id from payload", () => {
    expect(
      getOrderIdFromWebhookPayload({
        data: { order: { order_id: "VP_123" } },
      }),
    ).toBe("VP_123");
  });

  it("detects payment success webhook", () => {
    expect(isPaymentSuccessWebhook({ type: "PAYMENT_SUCCESS_WEBHOOK" })).toBe(true);
    expect(isPaymentSuccessWebhook({ data: { payment: { payment_status: "SUCCESS" } } })).toBe(
      true,
    );
  });

  it("detects payment failed webhook", () => {
    expect(isPaymentFailedWebhook({ type: "PAYMENT_FAILED_WEBHOOK" })).toBe(true);
    expect(isPaymentFailedWebhook({ data: { payment: { payment_status: "FAILED" } } })).toBe(
      true,
    );
  });
});
