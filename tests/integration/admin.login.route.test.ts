import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/admin/login", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 400 when admin_secret is missing", async () => {
    const { POST } = await import("../../app/api/admin/login/route");
    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Admin PIN is required" });
  });

  it("returns 401 when admin_secret is invalid", async () => {
    const { POST } = await import("../../app/api/admin/login/route");
    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ admin_secret: "wrong-secret" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized: Invalid admin PIN",
    });
  });

  it("returns success when admin_secret is valid", async () => {
    const { POST } = await import("../../app/api/admin/login/route");
    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ admin_secret: "test-secret-123" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("returns 401 when ADMIN_SECRET env is not set", async () => {
    delete process.env.ADMIN_SECRET;
    vi.resetModules();

    const { POST } = await import("../../app/api/admin/login/route");
    const response = await POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ admin_secret: "test-secret-123" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
