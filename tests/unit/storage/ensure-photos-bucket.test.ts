import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_BUCKET } from "@/lib/storage/constants";

const listBucketsMock = vi.fn();
const createBucketMock = vi.fn();
const updateBucketMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      listBuckets: listBucketsMock,
      createBucket: createBucketMock,
      updateBucket: updateBucketMock,
    },
  }),
}));

describe("ensurePhotosBucket", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { resetPhotosBucketCache } = await import("@/lib/storage/ensure-photos-bucket");
    resetPhotosBucketCache();
    listBucketsMock.mockResolvedValue({ data: [], error: null });
    createBucketMock.mockResolvedValue({ data: { name: STORAGE_BUCKET }, error: null });
    updateBucketMock.mockResolvedValue({ data: { name: STORAGE_BUCKET }, error: null });
  });

  it("creates the photos bucket when it does not exist", async () => {
    const { ensurePhotosBucket } = await import("@/lib/storage/ensure-photos-bucket");
    await ensurePhotosBucket();

    expect(createBucketMock).toHaveBeenCalledWith(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: expect.any(Number),
    });
  });

  it("skips creation when the photos bucket already exists and is public", async () => {
    listBucketsMock.mockResolvedValue({
      data: [{ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true }],
      error: null,
    });

    const { ensurePhotosBucket } = await import("@/lib/storage/ensure-photos-bucket");
    await ensurePhotosBucket();

    expect(createBucketMock).not.toHaveBeenCalled();
    expect(updateBucketMock).not.toHaveBeenCalled();
  });

  it("makes an existing private bucket public", async () => {
    listBucketsMock.mockResolvedValue({
      data: [{ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: false }],
      error: null,
    });

    const { ensurePhotosBucket } = await import("@/lib/storage/ensure-photos-bucket");
    await ensurePhotosBucket();

    expect(createBucketMock).not.toHaveBeenCalled();
    expect(updateBucketMock).toHaveBeenCalledWith(STORAGE_BUCKET, { public: true });
  });

  it("throws when bucket creation fails", async () => {
    createBucketMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const { ensurePhotosBucket } = await import("@/lib/storage/ensure-photos-bucket");
    await expect(ensurePhotosBucket()).rejects.toMatchObject({
      code: "BUCKET_NOT_FOUND",
    });
  });
});
