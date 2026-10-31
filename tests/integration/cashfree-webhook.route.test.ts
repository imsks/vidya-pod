import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeSponsorshipPaymentMock = vi.fn();
const failSponsorshipPaymentMock = vi.fn();
const completeCartPaymentMock = vi.fn();
const failCartPaymentMock = vi.fn();

vi.mock("@/lib/sponsorship/complete-cart", () => ({
  completeCartPayment: completeCartPaymentMock,
  failCartPayment: failCartPaymentMock,
}));

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
    completeCartPaymentMock.mockResolvedValue({
      success: true,
      status: "SUCCESS",
      orders: [{}, {}],
      alreadyCompleted: false,
    });
    failCartPaymentMock.mockResolvedValue({
      success: true,
      status: "FAILED",
      orders: [{}, {}],
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

  describe("for a payment covering several learners", () => {
    it("settles every learner on payment success", async () => {
      const { POST } = await import("../../app/api/webhooks/cashfree/route");
      const response = await POST(
        createSignedRequest({
          type: "PAYMENT_SUCCESS_WEBHOOK",
          data: { order: { order_id: "VPC_123_test" } },
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        status: "SUCCESS",
        learner_count: 2,
      });
      expect(completeCartPaymentMock).toHaveBeenCalledWith(expect.anything(), "VPC_123_test");
      expect(completeSponsorshipPaymentMock).not.toHaveBeenCalled();
    });

    it("releases every learner on payment failure", async () => {
      const { POST } = await import("../../app/api/webhooks/cashfree/route");
      const response = await POST(
        createSignedRequest({
          type: "PAYMENT_FAILED_WEBHOOK",
          data: { order: { order_id: "VPC_123_test" } },
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ status: "FAILED" });
      expect(failCartPaymentMock).toHaveBeenCalledWith(expect.anything(), "VPC_123_test");
      expect(failSponsorshipPaymentMock).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown payment", async () => {
      completeCartPaymentMock.mockResolvedValue({ success: false, reason: "order_not_found" });

      const { POST } = await import("../../app/api/webhooks/cashfree/route");
      const response = await POST(
        createSignedRequest({
          type: "PAYMENT_SUCCESS_WEBHOOK",
          data: { order: { order_id: "VPC_123_test" } },
        }),
      );

      expect(response.status).toBe(404);
    });

    it("acknowledges other events without settling", async () => {
      const { POST } = await import("../../app/api/webhooks/cashfree/route");
      const response = await POST(
        createSignedRequest({
          type: "PAYMENT_USER_DROPPED_WEBHOOK",
          data: { order: { order_id: "VPC_123_test" } },
        }),
      );

      expect(response.status).toBe(200);
      expect(completeCartPaymentMock).not.toHaveBeenCalled();
      expect(failCartPaymentMock).not.toHaveBeenCalled();
    });
  });
});
