// TODO: Remove this PIN-based authentication once RBAC is enabled.
// This is a temporary solution for admin-only access.

export const ADMIN_SECRET_HEADER = "x-admin-secret";

export const validateAdminSecret = (secret: string | null | undefined): boolean => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.warn("ADMIN_SECRET environment variable is not set");
    return false;
  }
  return secret === adminSecret;
};

export const getAdminSecretFromRequest = (request: Request): string | null => {
  return request.headers.get(ADMIN_SECRET_HEADER);
};
