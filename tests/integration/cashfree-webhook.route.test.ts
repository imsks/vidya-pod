import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeSponsorshipPaymentMock = vi.fn();
const failSponsorshipPaymentMock = vi.fn();

vi.mock("@/lib/sponsorship/complete-sponsorship", () => ({
  completeSponsorshipPayment: completeSponsorshipPaymentMock,
  failSponsorshipPayment: failSponsorshipPaymentMock,
  getOrderIdFromWebhookPayload: (payload: { data?: { order?: { order_id?: string } } }) =>
    payload.data?.order?.order_id ?? null,
  isPaymentSuccessWebhook: (payload: { type?: string }) =>
    payload.type?.toUpperCase().includes("PAYMENT_SUCCESS") ?? false,
  isPaymentFailedWebhook: (payload: { type?: string }) =>
    payload.type?.toUpperCase().includes("PAYMENT_FAILED") ?? false,
}));

const createSignedRequest = (payload: object, secret = "webhook-secret") => {
  const timestamp = "1700000000";
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");

  return new Request("http://localhost/api/webhooks/cashfree", {
    method: "POST",
    headers: {
      "x-webhook-signature": signature,
      "x-webhook-timestamp": timestamp,
    },
    body: rawBody,
  });
};

describe("POST /api/webhooks/cashfree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.CASHFREE_WEBHOOK_SECRET = "webhook-secret";
    completeSponsorshipPaymentMock.mockResolvedValue({
      success: true,
      order: { status: "SUCCESS" },
      alreadyCompleted: false,
    });
    failSponsorshipPaymentMock.mockResolvedValue({
      success: true,
      order: { status: "FAILED" },
      alreadyCompleted: false,
    });
  });

  it("returns 401 for invalid signature", async () => {
    const { POST } = await import("../../app/api/webhooks/cashfree/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/cashfree", {
        method: "POST",
        headers: {
          "x-webhook-signature": "invalid",
          "x-webhook-timestamp": "1700000000",
        },
        body: JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("completes sponsorship on payment success webhook", async () => {
    const { POST } = await import("../../app/api/webhooks/cashfree/route");
    const response = await POST(
      createSignedRequest({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: { order: { order_id: "VP_123_test" } },
      }),
    );

    expect(response.status).toBe(200);
    expect(completeSponsorshipPaymentMock).toHaveBeenCalledWith(expect.anything(), "VP_123_test");
  });

  it("marks order failed on payment failed webhook", async () => {
    const { POST } = await import("../../app/api/webhooks/cashfree/route");
    const response = await POST(
      createSignedRequest({
        type: "PAYMENT_FAILED_WEBHOOK",
        data: { order: { order_id: "VP_123_test" } },
      }),
    );

    expect(response.status).toBe(200);
    expect(failSponsorshipPaymentMock).toHaveBeenCalledWith(expect.anything(), "VP_123_test");
  });

  it("returns 400 when order id is missing", async () => {
    const { POST } = await import("../../app/api/webhooks/cashfree/route");
    const response = await POST(
      createSignedRequest({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {},
      }),
    );

    expect(response.status).toBe(400);
  });
});
