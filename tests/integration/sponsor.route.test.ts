import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}));

describe("POST /api/sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    insertMock.mockResolvedValue({ error: null });
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "client";
    process.env.CASHFREE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 400 when amount does not match plan", async () => {
    const { POST } = await import("../../app/api/sponsor/route");
    const response = await POST(
      new Request("http://localhost/api/sponsor", {
        method: "POST",
        body: JSON.stringify({
          name: "Donor",
          email: "donor@example.com",
          phone: "9999999999",
          plan: "monthly",
          amount: 1,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates a cashfree order and persists a pending sponsor order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ payment_session_id: "session_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

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

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.paymentSessionId).toBe("session_123");
    expect(json.orderId).toMatch(/^VP_/);
    expect(fromMock).toHaveBeenCalledWith("sponsor_orders");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Donor",
        plan: "monthly",
        amount: 400,
        status: "PENDING",
        payment_session_id: "session_123",
      }),
    );
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
        body: JSON.stringify({
          name: "Donor",
          email: "donor@example.com",
          phone: "9999999999",
          plan: "yearly",
          amount: 4800,
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Payment gateway error",
    });
  });
});
