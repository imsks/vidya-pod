import { describe, expect, it, vi } from "vitest";
import { getPublicSponsorship } from "@/lib/sponsorship/get-public-sponsorship";

const buildPrisma = (order: unknown) => ({
  sponsorOrder: {
    findUnique: vi.fn().mockResolvedValue(order),
  },
});

describe("getPublicSponsorship", () => {
  it("returns null without querying for invalid slugs", async () => {
    const prisma = buildPrisma(null);
    const result = await getPublicSponsorship(prisma as never, "../secret");

    expect(result).toBeNull();
    expect(prisma.sponsorOrder.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the order is missing", async () => {
    const prisma = buildPrisma(null);
    expect(await getPublicSponsorship(prisma as never, "abcdefghijklmnop")).toBeNull();
  });

  it("returns null when the sponsorship is not successful", async () => {
    const prisma = buildPrisma({
      name: "Donor",
      plan: "monthly",
      status: "PENDING",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      sponsor: null,
      learner: { name: "Asha", standard: "8", imageUrl: null },
    });

    expect(await getPublicSponsorship(prisma as never, "abcdefghijklmnop")).toBeNull();
  });

  it("returns public sponsorship details for a successful order", async () => {
    const prisma = buildPrisma({
      name: "Donor",
      plan: "yearly",
      status: "SUCCESS",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      sponsor: { name: "Sponsor Name" },
      learner: { name: "Asha", standard: "8", imageUrl: "https://img" },
    });

    const result = await getPublicSponsorship(prisma as never, "abcdefghijklmnop");

    expect(prisma.sponsorOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shareSlug: "abcdefghijklmnop" } }),
    );
    expect(result).toEqual({
      sponsorName: "Sponsor Name",
      plan: "yearly",
      sponsoredAt: new Date("2025-01-01T00:00:00Z"),
      learner: { name: "Asha", standard: "8", imageUrl: "https://img" },
    });
  });

  it("falls back to the order name and null learner", async () => {
    const prisma = buildPrisma({
      name: "Donor",
      plan: "monthly",
      status: "SUCCESS",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      sponsor: null,
      learner: null,
    });

    const result = await getPublicSponsorship(prisma as never, "abcdefghijklmnop");

    expect(result?.sponsorName).toBe("Donor");
    expect(result?.learner).toBeNull();
  });
});
