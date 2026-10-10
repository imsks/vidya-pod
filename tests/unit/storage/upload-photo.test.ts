import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PHOTO_SIZE_BYTES, STORAGE_BUCKET } from "@/lib/storage/constants";
import { PhotoUploadError } from "@/lib/storage/errors";

const storageUploadMock = vi.fn();
const storageGetPublicUrlMock = vi.fn();
const ensurePhotosBucketMock = vi.fn();

vi.mock("@/lib/storage/ensure-photos-bucket", () => ({
  ensurePhotosBucket: () => ensurePhotosBucketMock(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe(STORAGE_BUCKET);
        return {
          upload: storageUploadMock,
          getPublicUrl: storageGetPublicUrlMock,
        };
      },
    },
  }),
}));

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const encodeBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

describe("uploadEntityPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    ensurePhotosBucketMock.mockResolvedValue(undefined);
    storageUploadMock.mockResolvedValue({
      data: { path: "learners/123-photo.jpg" },
      error: null,
    });
    storageGetPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://storage.example.com/learners/123-photo.jpg" },
    });
  });

  it("uploads a learner photo to the shared photos bucket under learners/", async () => {
    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    const url = await uploadEntityPhoto({
      entityType: "learner",
      base64Data: tinyPngBase64,
      filename: "photo.jpg",
    });

    expect(url).toBe("https://storage.example.com/learners/123-photo.jpg");
    expect(storageUploadMock).toHaveBeenCalledOnce();

    const [path, bytes, options] = storageUploadMock.mock.calls[0];
    expect(path).toMatch(/^learners\/\d+-photo\.jpg$/);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(options).toEqual({ contentType: "image/jpeg", upsert: false });
  });

  it("uses entity-specific folders for teacher, proctor, and donor", async () => {
    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await uploadEntityPhoto({
      entityType: "teacher",
      base64Data: tinyPngBase64,
      filename: "teacher.png",
    });
    expect(storageUploadMock.mock.calls[0][0]).toMatch(/^teachers\//);

    await uploadEntityPhoto({
      entityType: "proctor",
      base64Data: tinyPngBase64,
      filename: "proctor.webp",
    });
    expect(storageUploadMock.mock.calls[1][0]).toMatch(/^proctors\//);

    await uploadEntityPhoto({
      entityType: "donor",
      base64Data: tinyPngBase64,
      filename: "donor.gif",
    });
    expect(storageUploadMock.mock.calls[2][0]).toMatch(/^donors\//);
  });

  it("throws FILE_SIZE_LIMIT when decoded photo exceeds max size", async () => {
    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");
    const oversized = encodeBase64(new Uint8Array(MAX_PHOTO_SIZE_BYTES + 1));

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: oversized,
        filename: "large.jpg",
      }),
    ).rejects.toMatchObject({
      code: "FILE_SIZE_LIMIT",
      message: expect.stringMatching(/maximum allowed size/i),
    });

    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it("throws INVALID_FORMAT for unsupported extensions", async () => {
    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: tinyPngBase64,
        filename: "photo.bmp",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_FORMAT",
      message: expect.stringMatching(/unsupported photo format/i),
    });
  });

  it("throws INVALID_BASE64 for malformed data", async () => {
    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: "not-valid-base64!!!",
        filename: "photo.jpg",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_BASE64",
    });
  });

  it("throws BUCKET_NOT_FOUND when Supabase returns bucket missing", async () => {
    storageUploadMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Bucket not found", statusCode: "404" },
    });

    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: tinyPngBase64,
        filename: "photo.jpg",
      }),
    ).rejects.toEqual(
      new PhotoUploadError(
        `Storage bucket "${STORAGE_BUCKET}" was not found. Create it in Supabase Storage.`,
        "BUCKET_NOT_FOUND",
      ),
    );
  });

  it("maps Supabase payload-too-large errors to FILE_SIZE_LIMIT", async () => {
    storageUploadMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Payload too large", statusCode: "413" },
    });

    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: tinyPngBase64,
        filename: "photo.jpg",
      }),
    ).rejects.toMatchObject({
      code: "FILE_SIZE_LIMIT",
    });
  });

  it("maps RLS policy errors to STORAGE_POLICY_DENIED", async () => {
    storageUploadMock.mockResolvedValueOnce({
      data: null,
      error: { message: "new row violates row-level security policy", statusCode: "403" },
    });

    const { uploadEntityPhoto } = await import("@/lib/storage/upload-photo");

    await expect(
      uploadEntityPhoto({
        entityType: "learner",
        base64Data: tinyPngBase64,
        filename: "photo.jpg",
      }),
    ).rejects.toMatchObject({
      code: "STORAGE_POLICY_DENIED",
      message: expect.stringMatching(/SUPABASE_SECRET_KEY/i),
    });
  });
});

describe("PhotoUploadError helpers", () => {
  it("identifies validation errors", async () => {
    const { isPhotoValidationError } = await import("@/lib/storage/errors");

    expect(isPhotoValidationError(new PhotoUploadError("too big", "FILE_SIZE_LIMIT"))).toBe(true);
    expect(isPhotoValidationError(new PhotoUploadError("bad bucket", "BUCKET_NOT_FOUND"))).toBe(
      false,
    );
  });
});
