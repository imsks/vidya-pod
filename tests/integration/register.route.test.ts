import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
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
    expect(fromMock).not.toHaveBeenCalled();
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
    expect(fromMock).toHaveBeenCalledWith("students");
    expect(insertMock).toHaveBeenCalledWith({
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      image_url: null,
    });
  });

  it("returns 500 when supabase insert fails", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "db down" } });
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
