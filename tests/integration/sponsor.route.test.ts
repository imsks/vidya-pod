import { beforeEach, describe, expect, it, vi } from "vitest";

const LEARNER_ID = "550e8400-e29b-41d4-a716-446655440010";

const sponsorOrderCreateMock = vi.fn();
const learnerFindUniqueMock = vi.fn();
const sponsorOrderFindFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      create: sponsorOrderCreateMock,
      findFirst: sponsorOrderFindFirstMock,
    },
    learner: {
      findUnique: learnerFindUniqueMock,
    },
  }),
}));

const validPayload = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly" as const,
  amount: 400,
  learner_id: LEARNER_ID,
};

describe("POST /api/sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    sponsorOrderCreateMock.mockResolvedValue({});
    learnerFindUniqueMock.mockResolvedValue({
      id: LEARNER_ID,
      name: "Asha Kumar",
      standard: "8",
      imageUrl: null,
      sponsorId: null,
    });
    sponsorOrderFindFirstMock.mockResolvedValue(null);
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "client";
    process.env.CASHFREE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 400 when learner_id is missing", async () => {
    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({
          name: "Donor",
          email: "donor@example.com",
          phone: "9999999999",
          plan: "monthly",
          amount: 400,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when amount does not match plan", async () => {
    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, amount: 1 }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when learner is not found", async () => {
    learnerFindUniqueMock.mockResolvedValue(null);

    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when learner is already sponsored", async () => {
    learnerFindUniqueMock.mockResolvedValue({
      id: LEARNER_ID,
      name: "Asha Kumar",
      standard: "8",
      imageUrl: null,
      sponsorId: "550e8400-e29b-41d4-a716-446655440099",
    });

    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 when learner has a pending order", async () => {
    sponsorOrderFindFirstMock.mockResolvedValue({ id: "pending-order" });

    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(409);
  });

  it("creates a cashfree order and persists a pending sponsor order with learnerId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ payment_session_id: "session_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.paymentSessionId).toBe("session_123");
    expect(json.orderId).toMatch(/^VP_/);
    expect(sponsorOrderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Donor",
        plan: "monthly",
        amount: 400,
        status: "PENDING",
        paymentSessionId: "session_123",
        learnerId: LEARNER_ID,
      }),
    });
  });

  it("returns 502 when cashfree fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "bad request" }),
      }),
    );

    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, plan: "yearly", amount: 4800 }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Payment gateway error",
    });
  });
});
