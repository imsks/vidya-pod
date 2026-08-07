import { beforeEach, describe, expect, it, vi } from "vitest";

const connectDB = vi.fn();
const SponsorOrder = { findOne: vi.fn(), findOneAndUpdate: vi.fn() };

vi.mock("@/lib/mongodb", () => ({
  connectDB,
}));

vi.mock("@/lib/models", () => ({
  SponsorOrder,
}));

const ORDER_ID = "VP_1234567890_abc123";

const existingOrder = {
  order_id: ORDER_ID,
  name: "Sponsor",
  email: "sponsor@example.com",
  phone: "9876543210",
  plan: "monthly",
  amount: 500,
  status: "PENDING",
  payment_session_id: "session_123",
};

const cashfreeResponse = (orderStatus: string) =>
  new Response(
    JSON.stringify({ order_status: orderStatus, cf_order_id: "cf_123" }),
    { status: 200 },
  );

const verifyRequest = (query: string) =>
  new Request(`http://localhost/api/sponsor/verify${query}`);

describe("GET /api/sponsor/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
    SponsorOrder.findOne.mockResolvedValue(existingOrder);
    SponsorOrder.findOneAndUpdate.mockResolvedValue(existingOrder);
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "test-client-id";
    process.env.CASHFREE_SECRET_KEY = "test-secret";
  });

  it("returns 400 when order_id is missing", async () => {
    const fetchMock = vi.spyOn(global, "fetch");

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(""));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "order_id is required" });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it("returns 404 when the order is not in the database", async () => {
    SponsorOrder.findOne.mockResolvedValue(null);
    const fetchMock = vi.spyOn(global, "fetch");

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Order not found" });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it("marks the order SUCCESS when Cashfree reports PAID", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("PAID"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(connectDB).toHaveBeenCalledOnce();
    expect(SponsorOrder.findOneAndUpdate).toHaveBeenCalledWith(
      { order_id: ORDER_ID },
      expect.objectContaining({
        status: "SUCCESS",
        cf_order_id: "cf_123",
        paid_at: expect.any(Date),
      }),
      { new: true },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      orderId: ORDER_ID,
      status: "SUCCESS",
      amount: 500,
      plan: "monthly",
    });

    fetchMock.mockRestore();
  });

  it("marks the order FAILED when Cashfree reports EXPIRED", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("EXPIRED"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    const [, update] = SponsorOrder.findOneAndUpdate.mock.calls[0];
    expect(update.status).toBe("FAILED");
    expect(update).not.toHaveProperty("paid_at");
    expect((await response.json()).status).toBe("FAILED");

    fetchMock.mockRestore();
  });

  it("marks the order FAILED when Cashfree reports TERMINATED", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("TERMINATED"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(SponsorOrder.findOneAndUpdate).toHaveBeenCalledWith(
      { order_id: ORDER_ID },
      expect.objectContaining({ status: "FAILED" }),
      { new: true },
    );
    expect((await response.json()).status).toBe("FAILED");

    fetchMock.mockRestore();
  });

  it("leaves the order PENDING when Cashfree reports ACTIVE", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("ACTIVE"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(SponsorOrder.findOneAndUpdate).not.toHaveBeenCalled();
    expect((await response.json()).status).toBe("PENDING");

    fetchMock.mockRestore();
  });

  it("treats an unrecognised order_status as PENDING without writing", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("SOME_NEW_STATUS"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(SponsorOrder.findOneAndUpdate).not.toHaveBeenCalled();
    expect((await response.json()).status).toBe("PENDING");

    fetchMock.mockRestore();
  });

  it("does not leak donor details in the response", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(cashfreeResponse("PAID"));

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));
    const body = await response.json();

    expect(Object.keys(body)).toEqual(["orderId", "status", "amount", "plan"]);

    fetchMock.mockRestore();
  });

  it("returns 502 when the Cashfree request fails", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "failed" }), { status: 400 }),
      );

    const { GET } = await import("./route");

    const response = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Payment gateway error" });
    expect(SponsorOrder.findOneAndUpdate).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it("is idempotent across repeated verification", async () => {
    // A Response body can only be read once, so each call needs a fresh one.
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async () => cashfreeResponse("PAID"));

    const { GET } = await import("./route");

    const first = await GET(verifyRequest(`?order_id=${ORDER_ID}`));
    const second = await GET(verifyRequest(`?order_id=${ORDER_ID}`));

    expect(SponsorOrder.findOneAndUpdate).toHaveBeenCalledTimes(2);

    const [firstFilter, firstUpdate] =
      SponsorOrder.findOneAndUpdate.mock.calls[0];
    const [secondFilter, secondUpdate] =
      SponsorOrder.findOneAndUpdate.mock.calls[1];

    expect(secondFilter).toEqual(firstFilter);
    expect(secondUpdate.status).toBe(firstUpdate.status);
    expect(secondUpdate.cf_order_id).toBe(firstUpdate.cf_order_id);
    expect(await second.json()).toEqual(await first.json());

    fetchMock.mockRestore();
  });
});
