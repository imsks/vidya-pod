import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const learnerCreateMock = vi.fn();
const uploadEntityPhotoMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: { create: learnerCreateMock },
  }),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    uploadEntityPhoto: (...args: unknown[]) => uploadEntityPhotoMock(...args),
  };
});

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
    uploadEntityPhotoMock.mockResolvedValue("https://storage.example.com/learners/test-image.jpg");
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

  it("returns 400 when photo exceeds size limit", async () => {
    const { PhotoUploadError } = await import("@/lib/storage");
    uploadEntityPhotoMock.mockRejectedValueOnce(
      new PhotoUploadError("Photo exceeds the maximum allowed size of 5.0 MB.", "FILE_SIZE_LIMIT"),
    );

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
          photo_data: "abc",
          photo_filename: "large.jpg",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/maximum allowed size/i);
    expect(learnerCreateMock).not.toHaveBeenCalled();
  });

  it("creates learner with warning when storage upload fails", async () => {
    const { PhotoUploadError } = await import("@/lib/storage");
    uploadEntityPhotoMock.mockRejectedValueOnce(
      new PhotoUploadError(
        'Storage bucket "photos" was not found. Create it in Supabase Storage.',
        "BUCKET_NOT_FOUND",
      ),
    );

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
          photo_data: "abc",
          photo_filename: "photo.jpg",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.warning).toMatch(/bucket "photos" was not found/i);
    expect(learnerCreateMock).toHaveBeenCalled();
  });
});
