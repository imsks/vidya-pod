import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma";

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: vi.fn(),
}));

const NOW = new Date("2026-01-01T00:10:00.000Z");
const FUTURE = new Date("2026-06-01T00:00:00.000Z");
const PAST = new Date("2025-06-01T00:00:00.000Z");

const learner = (
  id: string,
  sponsorId: string | null = null,
  sponsorshipEndsAt: Date | null = null,
) => ({
  id,
  name: `Learner ${id}`,
  standard: "5",
  imageUrl: null,
  sponsorId,
  sponsorshipEndsAt,
});

const buildPrisma = ({
  findUnique = vi.fn(),
  findFirst = vi.fn(),
  findMany = vi.fn(),
}: {
  findUnique?: ReturnType<typeof vi.fn>;
  findFirst?: ReturnType<typeof vi.fn>;
  findMany?: ReturnType<typeof vi.fn>;
}) =>
  ({
    learner: { findUnique },
    sponsorOrder: { findFirst, findMany },
  }) as unknown as PrismaClient;

describe("learner availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPONSORSHIP_RESERVATION_MINUTES;
  });

  describe("checkLearnerAvailableForSponsorship", () => {
    it("reports missing learners", async () => {
      const { checkLearnerAvailableForSponsorship } =
        await import("@/lib/sponsorship/validate-learner-available");
      const prisma = buildPrisma({ findUnique: vi.fn().mockResolvedValue(null) });

      await expect(checkLearnerAvailableForSponsorship(prisma, "l-1")).resolves.toEqual({
        available: false,
        reason: "not_found",
        message: "Learner not found",
      });
    });

    it("reports learners that already have an active sponsor", async () => {
      const { checkLearnerAvailableForSponsorship } =
        await import("@/lib/sponsorship/validate-learner-available");
      const prisma = buildPrisma({
        findUnique: vi.fn().mockResolvedValue(learner("l-1", "sponsor-1", null)),
      });

      await expect(checkLearnerAvailableForSponsorship(prisma, "l-1")).resolves.toMatchObject({
        available: false,
        reason: "already_sponsored",
      });
    });

    it("reports learners held by another checkout", async () => {
      const { checkLearnerAvailableForSponsorship } =
        await import("@/lib/sponsorship/validate-learner-available");
      const prisma = buildPrisma({
        findUnique: vi.fn().mockResolvedValue(learner("l-1")),
        findFirst: vi.fn().mockResolvedValue({ id: "order-1" }),
      });

      await expect(checkLearnerAvailableForSponsorship(prisma, "l-1")).resolves.toEqual({
        available: false,
        reason: "pending_order",
        message:
          "Someone is checking out for this learner right now. Please try again in a minute.",
      });
    });

    it("returns public learner fields when available", async () => {
      const { checkLearnerAvailableForSponsorship } =
        await import("@/lib/sponsorship/validate-learner-available");
      const prisma = buildPrisma({
        findUnique: vi.fn().mockResolvedValue(learner("l-1")),
        findFirst: vi.fn().mockResolvedValue(null),
      });

      await expect(checkLearnerAvailableForSponsorship(prisma, "l-1")).resolves.toEqual({
        available: true,
        learner: { id: "l-1", name: "Learner l-1", standard: "5", imageUrl: null },
      });
    });
  });

  describe("getLearnersAvailability", () => {
    it("classifies every learner with a single reservation query", async () => {
      const { getLearnersAvailability } =
        await import("@/lib/sponsorship/validate-learner-available");
      const findMany = vi.fn().mockResolvedValue([{ learnerId: "held" }]);
      const prisma = buildPrisma({ findMany });

      const availability = await getLearnersAvailability(
        prisma,
        [
          learner("free"),
          learner("held"),
          learner("taken", "sponsor-1", FUTURE),
          learner("lapsed", "sponsor-2", PAST),
        ],
        NOW,
      );

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          learnerId: { in: ["free", "held", "lapsed"] },
          status: "PENDING",
          createdAt: { gte: new Date("2026-01-01T00:09:00.000Z") },
        },
        select: { learnerId: true },
      });
      expect(Object.fromEntries(availability)).toEqual({
        free: { available: true },
        lapsed: { available: true },
        held: {
          available: false,
          reason: "pending_order",
          message:
            "Someone is checking out for this learner right now. Please try again in a minute.",
        },
        taken: {
          available: false,
          reason: "already_sponsored",
          message: "This learner is already sponsored",
        },
      });
    });

    it("skips the reservation query when every learner is already sponsored", async () => {
      const { getLearnersAvailability } =
        await import("@/lib/sponsorship/validate-learner-available");
      const findMany = vi.fn();

      const availability = await getLearnersAvailability(
        buildPrisma({ findMany }),
        [learner("taken", "sponsor-1", null)],
        NOW,
      );

      expect(findMany).not.toHaveBeenCalled();
      expect(availability.get("taken")).toMatchObject({ available: false });
    });

    it("returns an empty map for an empty cart", async () => {
      const { getLearnersAvailability } =
        await import("@/lib/sponsorship/validate-learner-available");
      const findMany = vi.fn();

      const availability = await getLearnersAvailability(buildPrisma({ findMany }), [], NOW);

      expect(availability.size).toBe(0);
      expect(findMany).not.toHaveBeenCalled();
    });
  });
});
