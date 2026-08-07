import { beforeEach, describe, expect, it, vi } from "vitest";

const connectDB = vi.fn();
const Student = { create: vi.fn() };
const Teacher = { create: vi.fn() };
const Proctor = { create: vi.fn() };

vi.mock("@/lib/mongodb", () => ({
  connectDB,
}));

vi.mock("@/lib/models", () => ({
  Student,
  Teacher,
  Proctor,
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ role: "student" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing required fields" });
  });

  it("returns 400 for invalid role", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          role: "admin",
          name: "Test",
          phone: "9876543210",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid role" });
  });

  it("creates a student when role is student", async () => {
    Student.create.mockResolvedValue({});
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          role: "student",
          name: "Rahul",
          phone: "9876543210",
          standard: "10",
        }),
      }),
    );

    expect(connectDB).toHaveBeenCalledOnce();
    expect(Student.create).toHaveBeenCalledWith({
      name: "Rahul",
      phone: "9876543210",
      standard: "10",
      image_url: undefined,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("creates a teacher when role is teacher", async () => {
    Teacher.create.mockResolvedValue({});
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          role: "teacher",
          name: "Meera",
          phone: "9876543210",
          qualification: "M.Sc",
        }),
      }),
    );

    expect(Teacher.create).toHaveBeenCalledWith({
      name: "Meera",
      phone: "9876543210",
      qualification: "M.Sc",
      image_url: undefined,
    });
    expect(response.status).toBe(200);
  });
});
