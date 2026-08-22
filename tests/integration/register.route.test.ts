import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const studentCreateMock = vi.fn();
const teacherCreateMock = vi.fn();
const proctorCreateMock = vi.fn();
const uploadEntityPhotoMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    student: { create: studentCreateMock },
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
    studentCreateMock.mockResolvedValue({
      id: "student-uuid",
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      imageUrl: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    teacherCreateMock.mockResolvedValue({
      id: "teacher-uuid",
      name: "Ravi",
      phone: "9999999999",
      qualification: "B.Ed",
      imageUrl: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    proctorCreateMock.mockResolvedValue({});
    uploadEntityPhotoMock.mockResolvedValue("https://storage.example.com/students/test-image.jpg");
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
          role: "student",
          name: "Asha",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized: Invalid admin PIN",
    });
    expect(studentCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when admin secret header is invalid", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "x-admin-secret": "wrong-secret" },
        body: JSON.stringify({
          role: "student",
          name: "Asha",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(studentCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ role: "student", name: "Asha" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
    expect(studentCreateMock).not.toHaveBeenCalled();
  });

  it("inserts a student and returns entity details", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          name: "Asha",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      entity: {
        id: "student-uuid",
        name: "Asha",
        phone: "9999999999",
        standard: "8",
        image_url: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(studentCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Asha",
        phone: "9999999999",
        standard: "8",
        imageUrl: null,
      },
    });
  });

  it("uploads a student photo when photo_data is provided", async () => {
    studentCreateMock.mockResolvedValueOnce({
      id: "student-uuid",
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      imageUrl: "https://storage.example.com/students/test-image.jpg",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          role: "student",
          name: "Asha",
          phone: "9999999999",
          standard: "8",
          photo_data: "data:image/png;base64,abc",
          photo_filename: "photo.png",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(uploadEntityPhotoMock).toHaveBeenCalledWith({
      entityType: "student",
      base64Data: "data:image/png;base64,abc",
      filename: "photo.png",
    });
    expect(studentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrl: "https://storage.example.com/students/test-image.jpg",
      }),
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
