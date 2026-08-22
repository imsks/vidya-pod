import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const teacherCreateMock = vi.fn();
const proctorCreateMock = vi.fn();
const uploadEntityPhotoMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    teacher: { create: teacherCreateMock },
    proctor: { create: proctorCreateMock },
  }),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    uploadEntityPhoto: (...args: unknown[]) => uploadEntityPhotoMock(...args),
  };
});

const adminHeaders = { "x-admin-secret": "test-secret-123" };

describe("POST /api/register", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
    teacherCreateMock.mockResolvedValue({
      id: "teacher-uuid",
      name: "Ravi",
      phone: "9999999999",
      qualification: "B.Ed",
      imageUrl: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    proctorCreateMock.mockResolvedValue({});
    uploadEntityPhotoMock.mockResolvedValue("https://storage.example.com/teachers/test-image.jpg");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when admin secret header is missing", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          role: "teacher",
          name: "Ravi",
          phone: "9999999999",
          qualification: "B.Ed",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(teacherCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ role: "teacher", name: "Ravi" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(teacherCreateMock).not.toHaveBeenCalled();
  });

  it("inserts a teacher and returns entity details", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "teacher",
          name: "Ravi",
          phone: "9999999999",
          qualification: "B.Ed",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      entity: {
        id: "teacher-uuid",
        name: "Ravi",
        phone: "9999999999",
        qualification: "B.Ed",
        image_url: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
  });

  it("uploads a teacher photo when photo_data is provided", async () => {
    teacherCreateMock.mockResolvedValueOnce({
      id: "teacher-uuid",
      name: "Ravi",
      phone: "9999999999",
      qualification: "B.Ed",
      imageUrl: "https://storage.example.com/teachers/test-image.jpg",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          role: "teacher",
          name: "Ravi",
          phone: "9999999999",
          qualification: "B.Ed",
          photo_data: "data:image/png;base64,abc",
          photo_filename: "photo.png",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(uploadEntityPhotoMock).toHaveBeenCalledWith({
      entityType: "teacher",
      base64Data: "data:image/png;base64,abc",
      filename: "photo.png",
    });
  });

  it("returns 500 when prisma insert fails", async () => {
    teacherCreateMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("../../app/api/register/route");

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          role: "teacher",
          name: "Ravi",
          phone: "9999999999",
          qualification: "B.Ed",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "db down" });
  });
});
