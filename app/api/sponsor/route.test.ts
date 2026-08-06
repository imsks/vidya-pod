import { beforeEach, describe, expect, it, vi } from "vitest";

const connectDB = vi.fn();
const SponsorOrder = { create: vi.fn() };

vi.mock("@/lib/mongodb", () => ({
  connectDB,
}));

vi.mock("@/lib/models", () => ({
  SponsorOrder,
}));

describe("POST /api/sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "test-client-id";
    process.env.CASHFREE_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({ name: "Sponsor" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing required fields" });
  });

  it("returns 400 for invalid plan", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({
          name: "Sponsor",
          email: "sponsor@example.com",
          phone: "9876543210",
          plan: "weekly",
          amount: 500,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid plan" });
  });

  it("creates sponsor order after Cashfree succeeds", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ payment_session_id: "session_123" }),
        { status: 200 },
      ),
    );
    SponsorOrder.create.mockResolvedValue({});

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({
          name: "Sponsor",
          email: "sponsor@example.com",
          phone: "9876543210",
          plan: "monthly",
          amount: 500,
        }),
      }),
    );

    expect(connectDB).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(SponsorOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sponsor",
        email: "sponsor@example.com",
        phone: "9876543210",
        plan: "monthly",
        amount: 500,
        status: "PENDING",
        payment_session_id: "session_123",
        order_id: expect.stringMatching(/^VP_/),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      orderId: expect.stringMatching(/^VP_/),
      paymentSessionId: "session_123",
    });

    fetchMock.mockRestore();
  });

  it("returns 502 when Cashfree fails", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "failed" }), { status: 400 }),
    );

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({
          name: "Sponsor",
          email: "sponsor@example.com",
          phone: "9876543210",
          plan: "yearly",
          amount: 5000,
        }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Payment gateway error" });
    expect(SponsorOrder.create).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });
});
