import { getSupabaseAdmin } from "@/lib/supabase";
import { MAX_PHOTO_SIZE_BYTES, STORAGE_BUCKET } from "@/lib/storage/constants";
import { PhotoUploadError } from "@/lib/storage/errors";

let bucketReadyPromise: Promise<void> | null = null;

const isBucketAlreadyExistsError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes("already exists") || normalized.includes("duplicate");
};

/**
 * Ensures the shared `photos` bucket exists and is public.
 * Safe to call before every upload — deduped per process via a shared promise.
 */
export const ensurePhotosBucket = async (): Promise<void> => {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const supabase = getSupabaseAdmin();
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        throw new PhotoUploadError(
          `Unable to verify storage bucket: ${listError.message}`,
          "STORAGE_UNAVAILABLE",
        );
      }

      const existingBucket = buckets?.find((bucket) => bucket.id === STORAGE_BUCKET);
      if (existingBucket) {
        if (!existingBucket.public) {
          const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
            public: true,
          });

          if (updateError) {
            throw new PhotoUploadError(
              `Storage bucket "${STORAGE_BUCKET}" exists but could not be made public: ${updateError.message}`,
              "STORAGE_UNAVAILABLE",
            );
          }
        }
        return;
      }

      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_PHOTO_SIZE_BYTES,
      });

      if (createError && !isBucketAlreadyExistsError(createError.message)) {
        throw new PhotoUploadError(
          `Storage bucket "${STORAGE_BUCKET}" was not found and could not be created: ${createError.message}`,
          "BUCKET_NOT_FOUND",
        );
      }
    })().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }

  await bucketReadyPromise;
};

export const resetPhotosBucketCache = (): void => {
  bucketReadyPromise = null;
};
