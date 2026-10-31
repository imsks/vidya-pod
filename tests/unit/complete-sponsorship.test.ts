import { describe, expect, it, vi } from "vitest";
import { SponsorOrderStatus } from "@/generated/prisma";
import {
  completeSponsorshipPayment,
  failSponsorshipPayment,
  getOrderIdFromWebhookPayload,
  isPaymentFailedWebhook,
  isPaymentSuccessWebhook,
} from "@/lib/sponsorship/complete-sponsorship";

type CompletionPrismaOptions = {
  order?: Record<string, unknown>;
  learner: { sponsorId: string | null; sponsorshipEndsAt: Date | null };
  learnerUpdate: ReturnType<typeof vi.fn>;
  sponsor?: { id: string } | null;
  sponsorUpdate?: ReturnType<typeof vi.fn>;
};

const buildCompletionPrisma = ({
  order,
  learner,
  learnerUpdate,
  sponsor = { id: "sponsor-1" },
  sponsorUpdate = vi.fn().mockResolvedValue({ id: "sponsor-1" }),
}: CompletionPrismaOptions) => {
  const baseOrder = {
    id: "order-1",
    orderId: "VP_123",
    status: SponsorOrderStatus.PENDING,
    name: "Donor",
    email: "donor@example.com",
    phone: "9999999999",
    plan: "monthly",
    learnerId: "learner-1",
    publicAcknowledgementOptIn: false,
    ...order,
  };

  return {
    sponsorOrder: {
      findUnique: vi.fn().mockResolvedValue(baseOrder),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        sponsor: {
          findFirst: vi.fn().mockResolvedValue(sponsor),
          create: vi.fn().mockResolvedValue({ id: "sponsor-1" }),
          update: sponsorUpdate,
        },
        sponsorOrder: {
          update: vi.fn().mockResolvedValue({ ...baseOrder, status: SponsorOrderStatus.SUCCESS }),
        },
        learner: {
          findUnique: vi.fn().mockResolvedValue(learner),
          update: learnerUpdate,
        },
      }),
    ),
  };
};

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00.000Z"));

    const order = {
      id: "order-1",
      orderId: "VP_123",
      status: SponsorOrderStatus.PENDING,
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "monthly",
      learnerId: "learner-1",
      publicAcknowledgementOptIn: false,
    };

    const updatedOrder = { ...order, status: SponsorOrderStatus.SUCCESS, sponsorId: "sponsor-1" };

    const sponsorCreate = vi.fn().mockResolvedValue({ id: "sponsor-1" });
    const sponsorUpdate = vi.fn().mockResolvedValue({ id: "sponsor-1" });
    const sponsorFindFirst = vi.fn().mockResolvedValue(null);
    const sponsorOrderUpdate = vi.fn().mockResolvedValue(updatedOrder);
    const learnerFindUnique = vi
      .fn()
      .mockResolvedValue({ sponsorId: null, sponsorshipEndsAt: null });
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
            update: sponsorUpdate,
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
        showPublicly: false,
      },
    });
    expect(sponsorUpdate).not.toHaveBeenCalled();
    expect(learnerUpdate).toHaveBeenCalledWith({
      where: { id: "learner-1" },
      data: {
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date("2026-12-05T10:00:00.000Z"),
      },
    });
    expect(sponsorOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        status: SponsorOrderStatus.SUCCESS,
        sponsorId: "sponsor-1",
        shareSlug: expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/),
      },
    });

    vi.useRealTimers();
  });

  it("applies the sponsor's public acknowledgement choice after payment", async () => {
    const sponsorUpdate = vi.fn().mockResolvedValue({ id: "sponsor-1" });
    const learnerUpdate = vi.fn().mockResolvedValue({});
    const prisma = buildCompletionPrisma({
      order: { publicAcknowledgementOptIn: true },
      learner: { sponsorId: "sponsor-1", sponsorshipEndsAt: null },
      learnerUpdate,
      sponsorUpdate,
    });

    await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(sponsorUpdate).toHaveBeenCalledWith({
      where: { id: "sponsor-1" },
      data: { showPublicly: true },
    });
  });

  it("gives yearly orders a twelve month period", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00.000Z"));

    const learnerUpdate = vi.fn().mockResolvedValue({});
    const prisma = buildCompletionPrisma({
      order: { plan: "yearly" },
      learner: { sponsorId: null, sponsorshipEndsAt: null },
      learnerUpdate,
    });

    await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(learnerUpdate).toHaveBeenCalledWith({
      where: { id: "learner-1" },
      data: {
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date("2027-11-05T10:00:00.000Z"),
      },
    });

    vi.useRealTimers();
  });

  it("reassigns a learner whose sponsorship has lapsed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00.000Z"));

    const learnerUpdate = vi.fn().mockResolvedValue({});
    const prisma = buildCompletionPrisma({
      learner: {
        sponsorId: "previous-sponsor",
        sponsorshipEndsAt: new Date("2026-10-31T18:29:59.999Z"),
      },
      learnerUpdate,
    });

    await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(learnerUpdate).toHaveBeenCalledWith({
      where: { id: "learner-1" },
      data: {
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date("2026-12-05T10:00:00.000Z"),
      },
    });

    vi.useRealTimers();
  });

  it("does not overwrite an active sponsorship", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T10:00:00.000Z"));

    const learnerUpdate = vi.fn().mockResolvedValue({});
    const prisma = buildCompletionPrisma({
      learner: {
        sponsorId: "other-sponsor",
        sponsorshipEndsAt: new Date("2026-12-31T00:00:00.000Z"),
      },
      learnerUpdate,
    });

    await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(learnerUpdate).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("never lapses a learner with no end date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-11-05T10:00:00.000Z"));

    const learnerUpdate = vi.fn().mockResolvedValue({});
    const prisma = buildCompletionPrisma({
      learner: { sponsorId: "other-sponsor", sponsorshipEndsAt: null },
      learnerUpdate,
    });

    await completeSponsorshipPayment(prisma as never, "VP_123");

    expect(learnerUpdate).not.toHaveBeenCalled();

    vi.useRealTimers();
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
    expect(isPaymentFailedWebhook({ data: { payment: { payment_status: "FAILED" } } })).toBe(true);
  });
});
