import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const learnerCreateMock = vi.fn();
const storageUploadMock = vi.fn();
const storageGetPublicUrlMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: { create: learnerCreateMock },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: storageUploadMock,
        getPublicUrl: storageGetPublicUrlMock,
      }),
    },
  }),
}));

describe("POST /api/learner", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
    learnerCreateMock.mockResolvedValue({
      id: "test-uuid",
      name: "Test Learner",
      phone: "9999999999",
      standard: "8",
      imageUrl: null,
      sponsorId: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    storageUploadMock.mockResolvedValue({
      data: { path: "learners/test-image.jpg" },
      error: null,
    });
    storageGetPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://storage.example.com/learners/test-image.jpg" },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when admin_secret is missing", async () => {
    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toMatch(/unauthorized/i);
    expect(learnerCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when admin_secret is invalid", async () => {
    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        body: JSON.stringify({
          admin_secret: "wrong-secret",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toMatch(/unauthorized/i);
    expect(learnerCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid learner payload (missing required fields)", async () => {
    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        body: JSON.stringify({
          admin_secret: "test-secret-123",
          name: "Test Learner",
          // missing phone and standard
        }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(learnerCreateMock).not.toHaveBeenCalled();
  });

  it("creates a learner successfully with valid data", async () => {
    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_secret: "test-secret-123",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.learner).toBeDefined();
    expect(data.learner.name).toBe("Test Learner");
    expect(learnerCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Test Learner",
        phone: "9999999999",
        standard: "8",
        imageUrl: null,
        sponsorId: null,
      },
    });
  });

  it("creates a learner with sponsor_id", async () => {
    const sponsorId = "550e8400-e29b-41d4-a716-446655440000";
    learnerCreateMock.mockResolvedValueOnce({
      id: "test-uuid",
      name: "Test Learner",
      phone: "9999999999",
      standard: "8",
      imageUrl: null,
      sponsorId,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_secret: "test-secret-123",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
          sponsor_id: sponsorId,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(learnerCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Test Learner",
        phone: "9999999999",
        standard: "8",
        imageUrl: null,
        sponsorId,
      },
    });
  });

  it("creates a learner with image_url", async () => {
    const imageUrl = "https://example.com/photo.jpg";
    learnerCreateMock.mockResolvedValueOnce({
      id: "test-uuid",
      name: "Test Learner",
      phone: "9999999999",
      standard: "8",
      imageUrl,
      sponsorId: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_secret: "test-secret-123",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
          image_url: imageUrl,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(learnerCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Test Learner",
        phone: "9999999999",
        standard: "8",
        imageUrl,
        sponsorId: null,
      },
    });
  });

  it("returns 500 when prisma insert fails", async () => {
    learnerCreateMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("../../app/api/learner/route");

    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        body: JSON.stringify({
          admin_secret: "test-secret-123",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("db down");
  });

  it("returns 401 when ADMIN_SECRET env is not set", async () => {
    delete process.env.ADMIN_SECRET;
    vi.resetModules();

    const { POST } = await import("../../app/api/learner/route");
    const response = await POST(
      new Request("http://localhost/api/learner", {
        method: "POST",
        body: JSON.stringify({
          admin_secret: "some-secret",
          name: "Test Learner",
          phone: "9999999999",
          standard: "8",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(learnerCreateMock).not.toHaveBeenCalled();
  });
});
