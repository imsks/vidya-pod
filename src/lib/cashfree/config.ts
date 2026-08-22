const CASHFREE_API_VERSION = "2023-08-01";

export const getCashfreeBaseUrl = (): string => {
  const baseUrl = process.env.CASHFREE_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("CASHFREE_BASE_URL is not configured");
  }
  return baseUrl;
};

export const getCashfreeCredentials = (): { clientId: string; secretKey: string } => {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!clientId || !secretKey) {
    throw new Error("Cashfree credentials are not configured");
  }

  return { clientId, secretKey };
};

export const buildCashfreeHeaders = (): Record<string, string> => {
  const { clientId, secretKey } = getCashfreeCredentials();

  return {
    "Content-Type": "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": clientId,
    "x-client-secret": secretKey,
  };
};

export const isCashfreeConfigured = (): boolean => {
  return Boolean(
    process.env.CASHFREE_BASE_URL &&
    process.env.CASHFREE_CLIENT_ID &&
    process.env.CASHFREE_SECRET_KEY,
  );
};
