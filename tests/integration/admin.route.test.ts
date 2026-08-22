import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const teacherFindManyMock = vi.fn();
const studentFindManyMock = vi.fn();
const proctorFindManyMock = vi.fn();
const sponsorOrderFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    teacher: { findMany: teacherFindManyMock },
    student: { findMany: studentFindManyMock },
    proctor: { findMany: proctorFindManyMock },
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
    studentFindManyMock.mockResolvedValue([]);
    proctorFindManyMock.mockResolvedValue([]);
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
      students: [],
      proctors: [],
      sponsors: [],
    });
    expect(teacherFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(studentFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(proctorFindManyMock).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(sponsorOrderFindManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        learner: {
          select: { id: true, name: true },
        },
      },
    });
  });
});
