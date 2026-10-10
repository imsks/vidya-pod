export type PhotoUploadErrorCode =
  | "FILE_SIZE_LIMIT"
  | "INVALID_FORMAT"
  | "INVALID_BASE64"
  | "BUCKET_NOT_FOUND"
  | "STORAGE_POLICY_DENIED"
  | "UPLOAD_FAILED"
  | "STORAGE_UNAVAILABLE";

export class PhotoUploadError extends Error {
  readonly code: PhotoUploadErrorCode;

  constructor(message: string, code: PhotoUploadErrorCode) {
    super(message);
    this.name = "PhotoUploadError";
    this.code = code;
  }
}

export const isPhotoUploadError = (error: unknown): error is PhotoUploadError =>
  error instanceof PhotoUploadError;

/** Client/validation errors that should fail the request before persisting data. */
export const isPhotoValidationError = (error: PhotoUploadError): boolean =>
  error.code === "FILE_SIZE_LIMIT" ||
  error.code === "INVALID_FORMAT" ||
  error.code === "INVALID_BASE64";
