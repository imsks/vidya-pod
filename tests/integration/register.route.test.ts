import { beforeEach, describe, expect, it, vi } from "vitest";

const studentCreateMock = vi.fn();
const teacherCreateMock = vi.fn();
const proctorCreateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    student: { create: studentCreateMock },
    teacher: { create: teacherCreateMock },
    proctor: { create: proctorCreateMock },
  }),
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    studentCreateMock.mockResolvedValue({});
    teacherCreateMock.mockResolvedValue({});
    proctorCreateMock.mockResolvedValue({});
  });

  it("returns 400 for invalid payloads", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ role: "student", name: "Asha" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
    expect(studentCreateMock).not.toHaveBeenCalled();
  });

  it("inserts a student and returns success", async () => {
    const { POST } = await import("../../app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          name: "Asha",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(studentCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Asha",
        phone: "9999999999",
        standard: "8",
        imageUrl: null,
      },
    });
  });

  it("returns 500 when prisma insert fails", async () => {
    teacherCreateMock.mockRejectedValueOnce(new Error("db down"));
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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "db down" });
  });
});
