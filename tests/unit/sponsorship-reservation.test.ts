import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma";

const syncSponsorOrderFromCashfreeMock = vi.fn();

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: syncSponsorOrderFromCashfreeMock,
}));

const LEARNER_ID = "550e8400-e29b-41d4-a716-446655440010";

type SponsorOrderMocks = {
  findMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const buildPrisma = (sponsorOrder: SponsorOrderMocks) =>
  ({ sponsorOrder }) as unknown as PrismaClient;

describe("sponsorship reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPONSORSHIP_RESERVATION_MINUTES;
  });

  afterEach(() => {
    delete process.env.SPONSORSHIP_RESERVATION_MINUTES;
  });

  describe("getReservationCutoff", () => {
    it("defaults to a one minute window", async () => {
      const { getReservationCutoff } = await import("@/lib/sponsorship/reservation");
      const now = new Date("2026-01-01T00:10:00.000Z");

      expect(getReservationCutoff(now).toISOString()).toBe("2026-01-01T00:09:00.000Z");
    });

    it("honours SPONSORSHIP_RESERVATION_MINUTES", async () => {
      process.env.SPONSORSHIP_RESERVATION_MINUTES = "10";
      const { getReservationCutoff } = await import("@/lib/sponsorship/reservation");
      const now = new Date("2026-01-01T00:10:00.000Z");

      expect(getReservationCutoff(now).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    });
  });

  describe("releaseExpiredReservations", () => {
    it("expires stale pending orders after reconciling with cashfree", async () => {
      const sponsorOrder: SponsorOrderMocks = {
        findMany: vi.fn().mockResolvedValue([{ id: "order-1", orderId: "VP_1" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
        create: vi.fn(),
      };

      const { releaseExpiredReservations } = await import("@/lib/sponsorship/reservation");
      const released = await releaseExpiredReservations(buildPrisma(sponsorOrder), LEARNER_ID);

      expect(syncSponsorOrderFromCashfreeMock).toHaveBeenCalledWith(expect.anything(), "VP_1");
      expect(sponsorOrder.updateMany).toHaveBeenCalledWith({
        where: { id: "order-1", status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      expect(released).toBe(1);
    });

    it("leaves an order alone when cashfree reports it as paid", async () => {
      const sponsorOrder: SponsorOrderMocks = {
        findMany: vi.fn().mockResolvedValue([{ id: "order-1", orderId: "VP_1" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn(),
        create: vi.fn(),
      };

      const { releaseExpiredReservations } = await import("@/lib/sponsorship/reservation");
      const released = await releaseExpiredReservations(buildPrisma(sponsorOrder), LEARNER_ID);

      expect(released).toBe(0);
    });

    it("does nothing when no stale orders exist", async () => {
      const sponsorOrder: SponsorOrderMocks = {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      };

      const { releaseExpiredReservations } = await import("@/lib/sponsorship/reservation");

      expect(await releaseExpiredReservations(buildPrisma(sponsorOrder), LEARNER_ID)).toBe(0);
      expect(syncSponsorOrderFromCashfreeMock).not.toHaveBeenCalled();
      expect(sponsorOrder.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("reserveLearnerForSponsorship", () => {
    const input = {
      orderId: "VP_1",
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "monthly" as const,
      amount: 400,
      learnerId: LEARNER_ID,
      publicAcknowledgementOptIn: false,
    };

    it("reserves when this order is the earliest active claim", async () => {
      const sponsorOrder: SponsorOrderMocks = {
        create: vi.fn().mockResolvedValue({ id: "mine", createdAt: new Date() }),
        findMany: vi.fn().mockResolvedValue([{ id: "mine" }]),
        updateMany: vi.fn(),
        update: vi.fn(),
      };

      const { reserveLearnerForSponsorship } = await import("@/lib/sponsorship/reservation");
      const result = await reserveLearnerForSponsorship(buildPrisma(sponsorOrder), input);

      expect(result).toEqual({ reserved: true, id: "mine" });
      expect(sponsorOrder.update).not.toHaveBeenCalled();
    });

    it("expires its own claim when another request won the race", async () => {
      const sponsorOrder: SponsorOrderMocks = {
        create: vi.fn().mockResolvedValue({ id: "mine", createdAt: new Date() }),
        findMany: vi.fn().mockResolvedValue([{ id: "theirs" }]),
        updateMany: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      };

      const { reserveLearnerForSponsorship } = await import("@/lib/sponsorship/reservation");
      const result = await reserveLearnerForSponsorship(buildPrisma(sponsorOrder), input);

      expect(result).toEqual({ reserved: false, reason: "lost_race" });
      expect(sponsorOrder.update).toHaveBeenCalledWith({
        where: { id: "mine" },
        data: { status: "EXPIRED" },
      });
    });
  });
});
