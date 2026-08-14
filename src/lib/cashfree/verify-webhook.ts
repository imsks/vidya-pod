import { createHmac, timingSafeEqual } from "crypto";

export const verifyCashfreeWebhookSignature = (
  signature: string | null,
  timestamp: string | null,
  rawBody: string,
  secret: string,
): boolean => {
  if (!signature || !timestamp || !secret) {
    return false;
  }

  const computed = createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");

  try {
    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computed);

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, computedBuffer);
  } catch {
    return false;
  }
};
