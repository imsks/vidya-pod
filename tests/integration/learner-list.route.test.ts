import { beforeEach, describe, expect, it, vi } from "vitest";

const learnerFindManyMock = vi.fn();
const learnerCountMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: { findMany: learnerFindManyMock, count: learnerCountMock },
  }),
}));

const buildRequest = (query: string) => {
  const url = `http://localhost/api/learner${query}`;
  const request = new Request(url);
  Object.defineProperty(request, "nextUrl", { value: new URL(url) });
  return request as never;
};

const AVAILABLE_WHERE = {
  OR: [{ sponsorId: null }, { sponsorshipEndsAt: { lt: expect.any(Date) } }],
};

const SPONSORED_WHERE = {
  sponsorId: { not: null },
  OR: [{ sponsorshipEndsAt: null }, { sponsorshipEndsAt: { gte: expect.any(Date) } }],
};

describe("GET /api/learner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    learnerCountMock.mockResolvedValue(0);
    learnerFindManyMock.mockResolvedValue([]);
  });

  it("rejects an unknown status", async () => {
    const { GET } = await import("../../app/api/learner/route");
    const response = await GET(buildRequest("?status=lapsed"));

    expect(response.status).toBe(400);
  });

  it("filters available learners by sponsor or elapsed period", async () => {
    const { GET } = await import("../../app/api/learner/route");
    await GET(buildRequest("?status=available"));

    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: AVAILABLE_WHERE }),
    );
  });

  it("filters sponsored learners to active periods only", async () => {
    const { GET } = await import("../../app/api/learner/route");
    await GET(buildRequest("?status=sponsored"));

    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: SPONSORED_WHERE }),
    );
  });

  it("counts both buckets with complementary predicates", async () => {
    const { GET } = await import("../../app/api/learner/route");
    await GET(buildRequest(""));

    expect(learnerCountMock).toHaveBeenCalledWith({ where: SPONSORED_WHERE });
    expect(learnerCountMock).toHaveBeenCalledWith({ where: AVAILABLE_WHERE });
  });

  it("reports a lapsed learner as unsponsored", async () => {
    learnerFindManyMock.mockResolvedValue([
      {
        id: "uuid-1",
        name: "Asha Kumar",
        standard: "8",
        imageUrl: null,
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date(Date.now() - 86_400_000),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const { GET } = await import("../../app/api/learner/route");
    const response = await GET(buildRequest(""));
    const data = await response.json();

    expect(data.data[0].is_sponsored).toBe(false);
    expect(data.data[0].sponsorship_ends_at).not.toBeNull();
  });

  it("reports a learner with no end date as sponsored", async () => {
    learnerFindManyMock.mockResolvedValue([
      {
        id: "uuid-2",
        name: "Ravi Sharma",
        standard: "10",
        imageUrl: null,
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const { GET } = await import("../../app/api/learner/route");
    const response = await GET(buildRequest(""));
    const data = await response.json();

    expect(data.data[0].is_sponsored).toBe(true);
    expect(data.data[0].sponsorship_ends_at).toBeNull();
  });
});
