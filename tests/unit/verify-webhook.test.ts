import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree/verify-webhook";

describe("verifyCashfreeWebhookSignature", () => {
  it("returns true for a valid signature", () => {
    const secret = "webhook-secret";
    const timestamp = "1700000000";
    const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
    const signature = createHmac("sha256", secret)
      .update(timestamp + rawBody)
      .digest("base64");

    expect(verifyCashfreeWebhookSignature(signature, timestamp, rawBody, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(
      verifyCashfreeWebhookSignature("invalid", "1700000000", "{}", "webhook-secret"),
    ).toBe(false);
  });

  it("returns false when headers or secret are missing", () => {
    expect(verifyCashfreeWebhookSignature(null, "1700000000", "{}", "secret")).toBe(false);
    expect(verifyCashfreeWebhookSignature("sig", null, "{}", "secret")).toBe(false);
    expect(verifyCashfreeWebhookSignature("sig", "1700000000", "{}", "")).toBe(false);
  });
});
