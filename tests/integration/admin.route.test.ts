import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const teacherFindManyMock = vi.fn();
const learnerFindManyMock = vi.fn();
const proctorFindManyMock = vi.fn();
const sponsorFindManyMock = vi.fn();
const sponsorOrderFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    teacher: { findMany: teacherFindManyMock },
    learner: { findMany: learnerFindManyMock },
    proctor: { findMany: proctorFindManyMock },
    sponsor: { findMany: sponsorFindManyMock },
    sponsorOrder: { findMany: sponsorOrderFindManyMock },
  }),
}));

describe("GET /api/admin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
    teacherFindManyMock.mockResolvedValue([]);
    learnerFindManyMock.mockResolvedValue([]);
    proctorFindManyMock.mockResolvedValue([]);
    sponsorFindManyMock.mockResolvedValue([]);
    sponsorOrderFindManyMock.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when admin secret header is missing", async () => {
    const { GET } = await import("../../app/api/admin/route");
    const response = await GET(new Request("http://localhost/api/admin"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized: Invalid admin PIN",
    });
    expect(teacherFindManyMock).not.toHaveBeenCalled();
  });

  it("returns 401 when admin secret header is invalid", async () => {
    const { GET } = await import("../../app/api/admin/route");
    const response = await GET(
      new Request("http://localhost/api/admin", {
        headers: { "x-admin-secret": "wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
    expect(teacherFindManyMock).not.toHaveBeenCalled();
  });

  it("returns empty collections when no rows exist", async () => {
    const { GET } = await import("../../app/api/admin/route");
    const response = await GET(
      new Request("http://localhost/api/admin", {
        headers: { "x-admin-secret": "test-secret-123" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      teachers: [],
      learners: [],
      proctors: [],
      sponsors: [],
      sponsor_orders: [],
    });
    expect(teacherFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(learnerFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(proctorFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(sponsorFindManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { learners: true, orders: true } },
      },
    });
    expect(sponsorOrderFindManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        learner: {
          select: { id: true, name: true },
        },
      },
    });
  });

  it("returns sponsors with their learner and order counts", async () => {
    sponsorFindManyMock.mockResolvedValue([
      {
        id: "sponsor-1",
        name: "Asha Foundation",
        email: "give@asha.org",
        phone: "9999999999",
        organization: "Asha",
        imageUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        _count: { learners: 3, orders: 4 },
      },
    ]);

    const { GET } = await import("../../app/api/admin/route");
    const response = await GET(
      new Request("http://localhost/api/admin", {
        headers: { "x-admin-secret": "test-secret-123" },
      }),
    );

    const body = (await response.json()) as { sponsors: unknown[] };
    expect(body.sponsors).toEqual([
      {
        id: "sponsor-1",
        name: "Asha Foundation",
        email: "give@asha.org",
        phone: "9999999999",
        organization: "Asha",
        image_url: null,
        learner_count: 3,
        order_count: 4,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});
