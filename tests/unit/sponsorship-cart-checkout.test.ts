import { beforeEach, describe, expect, it, vi } from "vitest";
import { MONTHLY_TOTAL, YEARLY_TOTAL } from "@/constants/pricing";
import { createInMemoryPrisma, type InMemoryPrisma } from "../helpers/in-memory-prisma";

const syncSponsorOrderFromCashfreeMock = vi.fn();

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: syncSponsorOrderFromCashfreeMock,
}));

const ASHA = "550e8400-e29b-41d4-a716-446655440001";
const RAVI = "550e8400-e29b-41d4-a716-446655440002";
const MISSING = "550e8400-e29b-41d4-a716-446655440099";
const KEY = "3f1c2b8e-6a0d-4b0f-9a59-2d1d3c4b5a69";

const donor = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly" as const,
  amount: MONTHLY_TOTAL * 2,
  idempotency_key: KEY,
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

const cashfreeOk = (sessionId = "session_123") =>
  new Response(JSON.stringify({ payment_session_id: sessionId }), { status: 200 });

let db: InMemoryPrisma;
let fetchMock: ReturnType<typeof vi.fn>;

const seedCartWith = (...learnerIds: string[]) => {
  const cart = db.seedCart();
  learnerIds.forEach((learnerId) => db.seedCartItem(cart.id, learnerId));
  return cart;
};

describe("startCartCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.SPONSORSHIP_RESERVATION_MINUTES;
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "client";
    process.env.CASHFREE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    syncSponsorOrderFromCashfreeMock.mockResolvedValue(false);
    fetchMock = vi.fn().mockResolvedValue(cashfreeOk());
    vi.stubGlobal("fetch", fetchMock);

    db = createInMemoryPrisma();
    db.seedLearner({ id: ASHA, name: "Asha", standard: "4" });
    db.seedLearner({ id: RAVI, name: "Ravi", standard: "6" });
  });

  it("creates one payment for every learner and holds each learner", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);

    const result = await startCartCheckout(db.prisma, cart.id, donor);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { orderId } = result.data;
    expect(orderId).toMatch(/^VPC_\d+_[a-z0-9]+$/);
    expect(result.data).toEqual({
      orderId,
      paymentSessionId: "session_123",
      amount: MONTHLY_TOTAL * 2,
      replayed: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sandbox.cashfree.com/orders");
    expect(JSON.parse(init.body as string)).toMatchObject({
      order_id: orderId,
      order_amount: MONTHLY_TOTAL * 2,
      order_currency: "INR",
      customer_details: { customer_email: "donor@example.com" },
      order_meta: { return_url: `http://localhost:3000/sponsor/thank-you?order_id=${orderId}` },
    });

    expect(db.tables.sponsorOrder).toEqual([
      expect.objectContaining({
        orderId: `${orderId}-1`,
        paymentOrderId: orderId,
        cartId: cart.id,
        learnerId: ASHA,
        amount: MONTHLY_TOTAL,
        plan: "monthly",
        status: "PENDING",
        paymentSessionId: "session_123",
      }),
      expect.objectContaining({
        orderId: `${orderId}-2`,
        paymentOrderId: orderId,
        learnerId: RAVI,
        amount: MONTHLY_TOTAL,
        status: "PENDING",
      }),
    ]);
    expect(cart).toMatchObject({
      status: "PENDING_PAYMENT",
      orderId,
      checkoutKey: KEY,
      amount: MONTHLY_TOTAL * 2,
      plan: "monthly",
      paymentSessionId: "session_123",
    });
  });

  it("charges every learner on the chosen plan", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);

    const result = await startCartCheckout(db.prisma, cart.id, {
      ...donor,
      plan: "yearly",
      amount: YEARLY_TOTAL * 2,
    });

    expect(result.ok && result.data.amount).toBe(YEARLY_TOTAL * 2);
    expect(db.tables.sponsorOrder.map((order) => [order.plan, order.amount])).toEqual([
      ["yearly", YEARLY_TOTAL],
      ["yearly", YEARLY_TOTAL],
    ]);
    expect(cart.plan).toBe("yearly");
  });

  it("replays the open payment for a retried request with the same idempotency key", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);

    const first = await startCartCheckout(db.prisma, cart.id, donor);
    const retry = await startCartCheckout(db.prisma, cart.id, donor);

    expect(first.ok && retry.ok).toBe(true);
    if (!first.ok || !retry.ok) return;
    expect(retry.data).toEqual({ ...first.data, replayed: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.tables.sponsorOrder).toHaveLength(2);
  });

  it("refuses a second checkout while a payment is open", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    const second = await startCartCheckout(db.prisma, cart.id, {
      ...donor,
      amount: MONTHLY_TOTAL,
      idempotency_key: "another-key-123",
    });
    const withoutKey = await startCartCheckout(db.prisma, cart.id, {
      ...donor,
      amount: MONTHLY_TOTAL,
      idempotency_key: undefined,
    });

    for (const result of [second, withoutKey]) {
      expect(result).toEqual({
        ok: false,
        status: 409,
        error:
          "A payment is already in progress for this cart. Please wait a minute and try again.",
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh attempt once an abandoned payment has expired", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    Object.assign(cart, {
      status: "PENDING_PAYMENT",
      orderId: "VPC_1_old",
      checkoutKey: KEY,
      paymentSessionId: "old_session",
      checkoutStartedAt: minutesAgo(5),
    });
    const oldHold = db.seedOrder({
      orderId: "VPC_1_old-1",
      paymentOrderId: "VPC_1_old",
      cartId: cart.id,
      learnerId: ASHA,
      createdAt: minutesAgo(5),
    });

    const result = await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    expect(result.ok && result.data.replayed).toBe(false);
    expect(result.ok && result.data.orderId).not.toBe("VPC_1_old");
    expect(oldHold.status).toBe("EXPIRED");
  });

  it("can retry after a failed payment", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    Object.assign(cart, { status: "FAILED", orderId: "VPC_1_old" });

    const result = await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    expect(result.ok).toBe(true);
    expect(cart.status).toBe("PENDING_PAYMENT");
  });

  it("rejects missing, paid and empty carts", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const paid = db.seedCart({ status: "PAID", orderId: "VPC_1_paid" });
    const empty = db.seedCart();

    await expect(startCartCheckout(db.prisma, MISSING, donor)).resolves.toMatchObject({
      status: 404,
      error: "Cart not found",
    });
    await expect(startCartCheckout(db.prisma, paid.id, donor)).resolves.toMatchObject({
      status: 409,
      error: "This cart has already been paid for. Start a new cart to sponsor more learners.",
    });
    await expect(startCartCheckout(db.prisma, empty.id, donor)).resolves.toMatchObject({
      status: 400,
      error: "Add at least one learner to your cart before checking out.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an amount that does not match the server total", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);

    const result = await startCartCheckout(db.prisma, cart.id, {
      ...donor,
      amount: MONTHLY_TOTAL,
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: `Amount must be ${MONTHLY_TOTAL * 2} for 2 learners on the monthly plan`,
    });
    expect(db.tables.sponsorOrder).toHaveLength(0);
    expect(cart.status).toBe("DRAFT");
  });

  it("lists learners that became unavailable and does not charge anyone", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);
    db.tables.learner[1].sponsorId = "sponsor-1";

    const result = await startCartCheckout(db.prisma, cart.id, donor);

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Some learners are no longer available. Remove them to continue.",
      unavailable: [
        {
          learner_id: RAVI,
          name: "Ravi",
          reason: "already_sponsored",
          message: "This learner is already sponsored",
        },
      ],
    });
    expect(db.tables.sponsorOrder).toHaveLength(0);
    expect(cart.status).toBe("DRAFT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a learner held by another donor as unavailable", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);
    db.seedOrder({ orderId: "VP_other", learnerId: ASHA });

    const result = await startCartCheckout(db.prisma, cart.id, donor);

    expect(result).toMatchObject({
      status: 409,
      unavailable: [expect.objectContaining({ learner_id: ASHA, reason: "pending_order" })],
    });
  });

  it("releases expired holds before checking availability", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    const stale = db.seedOrder({
      orderId: "VP_stale",
      learnerId: ASHA,
      createdAt: minutesAgo(5),
    });

    const result = await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    expect(result.ok).toBe(true);
    expect(syncSponsorOrderFromCashfreeMock).toHaveBeenCalledWith(db.prisma, "VP_stale");
    expect(stale.status).toBe("EXPIRED");
  });

  it("abandons the attempt when another donor wins a learner mid-checkout", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA, RAVI);
    const create = db.client.sponsorOrder.create;
    vi.spyOn(db.client.sponsorOrder, "create")
      .mockImplementationOnce(create)
      .mockImplementationOnce(async (args) => {
        db.seedOrder({ orderId: "VP_rival", learnerId: RAVI });
        return create(args);
      });

    const result = await startCartCheckout(db.prisma, cart.id, donor);

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Some learners are no longer available. Remove them to continue.",
      unavailable: [
        {
          learner_id: RAVI,
          name: "Ravi",
          reason: "pending_order",
          message:
            "Someone is checking out for this learner right now. Please try again in a minute.",
        },
      ],
    });
    const ours = db.tables.sponsorOrder.filter((order) => order.cartId === cart.id);
    expect(ours.map((order) => [order.learnerId, order.status])).toEqual([
      [ASHA, "FAILED"],
      [RAVI, "EXPIRED"],
    ]);
    expect(cart.status).toBe("DRAFT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts when the cart changes between the availability check and the claim", async () => {
    const { CART_CHANGED_MESSAGE, startCartCheckout } =
      await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    const findMany = db.client.sponsorshipCartItem.findMany;
    vi.spyOn(db.client.sponsorshipCartItem, "findMany").mockImplementationOnce(async (args) => {
      db.seedCartItem(cart.id, RAVI);
      return findMany(args);
    });

    const result = await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    expect(result).toEqual({ ok: false, status: 409, error: CART_CHANGED_MESSAGE });
    expect(cart.status).toBe("DRAFT");
    expect(db.tables.sponsorOrder).toHaveLength(0);
  });

  it("loses gracefully when a concurrent checkout claims the cart first", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    vi.spyOn(db.client.sponsorshipCart, "updateMany").mockResolvedValueOnce({ count: 0 });

    const result = await startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL });

    expect(result).toMatchObject({ status: 409 });
    expect(db.tables.sponsorOrder).toHaveLength(0);
  });

  it("releases every hold when the gateway rejects the order", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const cart = seedCartWith(ASHA, RAVI);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "bad request" }), { status: 400 }),
    );

    const result = await startCartCheckout(db.prisma, cart.id, donor);

    expect(result).toEqual({ ok: false, status: 502, error: "Payment gateway error" });
    expect(db.tables.sponsorOrder.map((order) => order.status)).toEqual(["FAILED", "FAILED"]);
    expect(cart).toMatchObject({ status: "DRAFT", paymentSessionId: null });
    consoleError.mockRestore();
  });

  it("releases every hold when the gateway is unreachable", async () => {
    const { startCartCheckout } = await import("@/lib/sponsorship/cart-checkout");
    const cart = seedCartWith(ASHA);
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      startCartCheckout(db.prisma, cart.id, { ...donor, amount: MONTHLY_TOTAL }),
    ).rejects.toThrow("network down");
    expect(db.tables.sponsorOrder.map((order) => order.status)).toEqual(["FAILED"]);
    expect(cart.status).toBe("DRAFT");
  });
});
