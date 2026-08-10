import { getSupabase } from "@/lib/supabase";
import {
  ALLOWED_PHOTO_EXTENSIONS,
  CONTENT_TYPE_BY_EXTENSION,
  ENTITY_STORAGE_FOLDERS,
  MAX_PHOTO_SIZE_BYTES,
  STORAGE_BUCKET,
  type AllowedPhotoExtension,
  type StorageEntityType,
} from "@/lib/storage/constants";
import { PhotoUploadError } from "@/lib/storage/errors";

export type UploadEntityPhotoInput = {
  entityType: StorageEntityType;
  base64Data: string;
  filename: string;
};

const sanitizeFilename = (filename: string): string => {
  const baseName = filename.split(/[/\\]/).pop() ?? "photo.jpg";
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return sanitized.length > 0 ? sanitized : "photo.jpg";
};

const getExtension = (filename: string): string | undefined =>
  filename.split(".").pop()?.toLowerCase();

const isAllowedExtension = (extension: string): extension is AllowedPhotoExtension =>
  (ALLOWED_PHOTO_EXTENSIONS as readonly string[]).includes(extension);

const decodeBase64Photo = (base64Data: string): Uint8Array => {
  const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;

  if (!base64Content || base64Content.trim().length === 0) {
    throw new PhotoUploadError("Photo data is empty or invalid.", "INVALID_BASE64");
  }

  try {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new PhotoUploadError("Photo data is not valid base64.", "INVALID_BASE64");
  }
};

const assertFileSizeWithinLimit = (bytes: Uint8Array): void => {
  if (bytes.length > MAX_PHOTO_SIZE_BYTES) {
    const maxSizeMb = (MAX_PHOTO_SIZE_BYTES / (1024 * 1024)).toFixed(1);
    throw new PhotoUploadError(
      `Photo exceeds the maximum allowed size of ${maxSizeMb} MB.`,
      "FILE_SIZE_LIMIT",
    );
  }

  if (bytes.length === 0) {
    throw new PhotoUploadError("Photo file is empty.", "INVALID_BASE64");
  }
};

const resolveContentType = (filename: string): string => {
  const extension = getExtension(filename);

  if (!extension || !isAllowedExtension(extension)) {
    throw new PhotoUploadError(
      `Unsupported photo format. Allowed formats: ${ALLOWED_PHOTO_EXTENSIONS.join(", ")}.`,
      "INVALID_FORMAT",
    );
  }

  return CONTENT_TYPE_BY_EXTENSION[extension];
};

const buildStoragePath = (entityType: StorageEntityType, filename: string): string => {
  const folder = ENTITY_STORAGE_FOLDERS[entityType];
  const safeFilename = sanitizeFilename(filename);
  return `${folder}/${Date.now()}-${safeFilename}`;
};

const mapStorageError = (message: string, statusCode?: string): PhotoUploadError => {
  const normalized = message.toLowerCase();

  if (normalized.includes("bucket not found")) {
    return new PhotoUploadError(
      `Storage bucket "${STORAGE_BUCKET}" was not found. Create it in Supabase Storage.`,
      "BUCKET_NOT_FOUND",
    );
  }

  if (normalized.includes("payload too large") || normalized.includes("file too large")) {
    return new PhotoUploadError(
      `Photo exceeds the maximum allowed size of ${(MAX_PHOTO_SIZE_BYTES / (1024 * 1024)).toFixed(1)} MB.`,
      "FILE_SIZE_LIMIT",
    );
  }

  if (statusCode === "413") {
    return new PhotoUploadError(
      `Photo exceeds the maximum allowed size of ${(MAX_PHOTO_SIZE_BYTES / (1024 * 1024)).toFixed(1)} MB.`,
      "FILE_SIZE_LIMIT",
    );
  }

  return new PhotoUploadError(message || "Photo upload failed.", "UPLOAD_FAILED");
};

/**
 * Uploads a base64-encoded profile photo to Supabase Storage.
 * Files are stored under `{entity-folder}/{timestamp}-{filename}` inside the shared `photos` bucket.
 */
export const uploadEntityPhoto = async ({
  entityType,
  base64Data,
  filename,
}: UploadEntityPhotoInput): Promise<string> => {
  const bytes = decodeBase64Photo(base64Data);
  assertFileSizeWithinLimit(bytes);
  const contentType = resolveContentType(filename);
  const storagePath = buildStoragePath(entityType, filename);

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

    if (error) {
      throw mapStorageError(error.message, "statusCode" in error ? String(error.statusCode) : undefined);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    if (error instanceof PhotoUploadError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Photo upload failed.";
    throw new PhotoUploadError(message, "STORAGE_UNAVAILABLE");
  }
};
