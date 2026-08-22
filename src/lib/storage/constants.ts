/** Single Supabase Storage bucket for all profile photos. */
export const STORAGE_BUCKET = "photos";

/** Default max photo size: 5 MB. Override with MAX_PHOTO_SIZE_BYTES env var. */
export const MAX_PHOTO_SIZE_BYTES = Number(process.env.MAX_PHOTO_SIZE_BYTES ?? 5 * 1024 * 1024);

export const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"] as const;

export type AllowedPhotoExtension = (typeof ALLOWED_PHOTO_EXTENSIONS)[number];

export type StorageEntityType = "learner" | "student" | "teacher" | "proctor" | "donor";

/** Folder prefix inside the bucket for each entity type. */
export const ENTITY_STORAGE_FOLDERS: Record<StorageEntityType, string> = {
  learner: "learners",
  student: "students",
  teacher: "teachers",
  proctor: "proctors",
  donor: "donors",
};

export const CONTENT_TYPE_BY_EXTENSION: Record<AllowedPhotoExtension, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};
