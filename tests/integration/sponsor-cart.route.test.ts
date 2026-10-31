import { beforeEach, describe, expect, it, vi } from "vitest";
import { MONTHLY_TOTAL } from "@/constants/pricing";
import { createInMemoryPrisma, type InMemoryPrisma } from "../helpers/in-memory-prisma";

let db: InMemoryPrisma;

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => db.prisma,
}));

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: vi.fn().mockResolvedValue(false),
}));

const ASHA = "550e8400-e29b-41d4-a716-446655440001";
const RAVI = "550e8400-e29b-41d4-a716-446655440002";
const MISSING = "550e8400-e29b-41d4-a716-446655440099";

const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

const jsonRequest = (method: string, body?: unknown) =>
  new Request("http://localhost/api/sponsor/cart", {
    method,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const checkoutBody = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly",
  amount: MONTHLY_TOTAL * 2,
  idempotency_key: "3f1c2b8e-6a0d-4b0f-9a59-2d1d3c4b5a69",
};

describe("sponsorship cart API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "client";
    process.env.CASHFREE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    db = createInMemoryPrisma();
    db.seedLearner({ id: ASHA, name: "Asha", standard: "4" });
    db.seedLearner({ id: RAVI, name: "Ravi", standard: "6" });
  });

  describe("POST /api/sponsor/cart", () => {
    it("creates an empty cart without a body", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/route");

      const response = await POST(jsonRequest("POST"));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({
        success: true,
        data: { status: "DRAFT", items: [], totals: { total: 0 } },
      });
    });

    it("creates a cart with learners", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/route");

      const response = await POST(jsonRequest("POST", { learner_ids: [ASHA, RAVI] }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.totals).toEqual({
        learner_count: 2,
        unit_amount: MONTHLY_TOTAL,
        total: MONTHLY_TOTAL * 2,
      });
    });

    it("rejects malformed JSON and invalid payloads", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/route");

      const malformed = await POST(jsonRequest("POST", "{nope"));
      const duplicate = await POST(jsonRequest("POST", { learner_ids: [ASHA, ASHA] }));

      expect(malformed.status).toBe(400);
      expect(await malformed.json()).toEqual({ error: "Request body must be valid JSON" });
      expect(duplicate.status).toBe(400);
      expect(await duplicate.json()).toEqual({ error: "Each learner can only be added once" });
    });

    it("returns the unavailable learners", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/route");
      db.tables.learner[0].sponsorId = "sponsor-1";

      const response = await POST(jsonRequest("POST", { learner_ids: [ASHA] }));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "Some learners are no longer available. Remove them to continue.",
        unavailable: [
          {
            learner_id: ASHA,
            name: "Asha",
            reason: "already_sponsored",
            message: "This learner is already sponsored",
          },
        ],
      });
    });

    it("hides internal errors", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/route");
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(db.client.sponsorshipCart, "create").mockRejectedValueOnce(
        new Error("connection refused at 10.0.0.1"),
      );

      const response = await POST(jsonRequest("POST"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
      consoleError.mockRestore();
    });
  });

  describe("GET and PATCH /api/sponsor/cart/[cartId]", () => {
    it("returns the cart", async () => {
      const { GET } = await import("../../app/api/sponsor/cart/[cartId]/route");
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);

      const response = await GET(jsonRequest("GET"), params({ cartId: cart.id }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toMatchObject({ id: cart.id, items: [{ learner_id: ASHA }] });
    });

    it("returns 404 for unknown or malformed cart ids", async () => {
      const { GET } = await import("../../app/api/sponsor/cart/[cartId]/route");
      const findUnique = vi.spyOn(db.client.sponsorshipCart, "findUnique");

      const malformed = await GET(jsonRequest("GET"), params({ cartId: "not-a-uuid" }));
      expect(malformed.status).toBe(404);
      expect(findUnique).not.toHaveBeenCalled();

      const missing = await GET(jsonRequest("GET"), params({ cartId: MISSING }));
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: "Cart not found" });
    });

    it("updates the plan", async () => {
      const { PATCH } = await import("../../app/api/sponsor/cart/[cartId]/route");
      const cart = db.seedCart();

      const response = await PATCH(
        jsonRequest("PATCH", { plan: "yearly" }),
        params({ cartId: cart.id }),
      );

      expect(response.status).toBe(200);
      expect((await response.json()).data.plan).toBe("yearly");
    });

    it("validates the plan and refuses locked carts", async () => {
      const { PATCH } = await import("../../app/api/sponsor/cart/[cartId]/route");
      const paid = db.seedCart({ status: "PAID", orderId: "VPC_1_abc" });

      const invalid = await PATCH(
        jsonRequest("PATCH", { plan: "weekly" }),
        params({ cartId: paid.id }),
      );
      const locked = await PATCH(
        jsonRequest("PATCH", { plan: "yearly" }),
        params({ cartId: paid.id }),
      );
      const malformed = await PATCH(jsonRequest("PATCH", "{"), params({ cartId: paid.id }));
      const missing = await PATCH(
        jsonRequest("PATCH", { plan: "yearly" }),
        params({ cartId: "x" }),
      );

      expect(invalid.status).toBe(400);
      expect(locked.status).toBe(409);
      expect(malformed.status).toBe(400);
      expect(missing.status).toBe(404);
    });
  });

  describe("cart items", () => {
    it("adds and removes learners", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/items/route");
      const { DELETE } =
        await import("../../app/api/sponsor/cart/[cartId]/items/[learnerId]/route");
      const cart = db.seedCart();

      const added = await POST(
        jsonRequest("POST", { learner_id: ASHA }),
        params({ cartId: cart.id }),
      );
      expect(added.status).toBe(201);
      expect((await added.json()).data.items).toHaveLength(1);

      const duplicate = await POST(
        jsonRequest("POST", { learner_id: ASHA }),
        params({ cartId: cart.id }),
      );
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toEqual({ error: "This learner is already in your cart" });

      const removed = await DELETE(
        jsonRequest("DELETE"),
        params({ cartId: cart.id, learnerId: ASHA }),
      );
      expect(removed.status).toBe(200);
      expect((await removed.json()).data.items).toEqual([]);

      const removedAgain = await DELETE(
        jsonRequest("DELETE"),
        params({ cartId: cart.id, learnerId: ASHA }),
      );
      expect(removedAgain.status).toBe(200);
    });

    it("validates ids and payloads", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/items/route");
      const { DELETE } =
        await import("../../app/api/sponsor/cart/[cartId]/items/[learnerId]/route");
      const cart = db.seedCart();

      const badCart = await POST(
        jsonRequest("POST", { learner_id: ASHA }),
        params({ cartId: "x" }),
      );
      const badBody = await POST(jsonRequest("POST", {}), params({ cartId: cart.id }));
      const badJson = await POST(jsonRequest("POST", "{"), params({ cartId: cart.id }));
      const badDeleteCart = await DELETE(
        jsonRequest("DELETE"),
        params({ cartId: "x", learnerId: ASHA }),
      );
      const badLearner = await DELETE(
        jsonRequest("DELETE"),
        params({ cartId: cart.id, learnerId: "x" }),
      );

      expect(badCart.status).toBe(404);
      expect(badBody.status).toBe(400);
      expect(badJson.status).toBe(400);
      expect(badDeleteCart.status).toBe(404);
      expect(badLearner.status).toBe(400);
      expect(await badLearner.json()).toEqual({ error: "Valid learner ID is required" });
    });

    it("hides internal errors", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/items/route");
      const { DELETE } =
        await import("../../app/api/sponsor/cart/[cartId]/items/[learnerId]/route");
      const { GET } = await import("../../app/api/sponsor/cart/[cartId]/route");
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const cart = db.seedCart();
      vi.spyOn(db.client.sponsorshipCart, "findUnique").mockRejectedValue(new Error("db down"));

      const responses = await Promise.all([
        POST(jsonRequest("POST", { learner_id: ASHA }), params({ cartId: cart.id })),
        DELETE(jsonRequest("DELETE"), params({ cartId: cart.id, learnerId: ASHA })),
        GET(jsonRequest("GET"), params({ cartId: cart.id })),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Internal server error" });
      }
      consoleError.mockRestore();
    });
  });

  describe("POST /api/sponsor/cart/[cartId]/checkout", () => {
    it("starts one payment for the whole cart", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/checkout/route");
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ payment_session_id: "session_123" }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);
      db.seedCartItem(cart.id, RAVI);

      const response = await POST(jsonRequest("POST", checkoutBody), params({ cartId: cart.id }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        orderId: expect.stringMatching(/^VPC_/),
        paymentSessionId: "session_123",
        amount: MONTHLY_TOTAL * 2,
        replayed: false,
      });

      const retry = await POST(jsonRequest("POST", checkoutBody), params({ cartId: cart.id }));
      expect(await retry.json()).toEqual({ ...body, replayed: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("maps validation and gateway failures to HTTP errors", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/checkout/route");
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);
      db.seedCartItem(cart.id, RAVI);

      const badCart = await POST(jsonRequest("POST", checkoutBody), params({ cartId: "x" }));
      const badJson = await POST(jsonRequest("POST", "{"), params({ cartId: cart.id }));
      const badEmail = await POST(
        jsonRequest("POST", { ...checkoutBody, email: "nope" }),
        params({ cartId: cart.id }),
      );
      const badAmount = await POST(
        jsonRequest("POST", { ...checkoutBody, amount: MONTHLY_TOTAL }),
        params({ cartId: cart.id }),
      );
      const gateway = await POST(jsonRequest("POST", checkoutBody), params({ cartId: cart.id }));

      expect(badCart.status).toBe(404);
      expect(badJson.status).toBe(400);
      expect(badEmail.status).toBe(400);
      expect(badAmount.status).toBe(400);
      expect(await badAmount.json()).toEqual({
        error: `Amount must be ${MONTHLY_TOTAL * 2} for 2 learners on the monthly plan`,
      });
      expect(gateway.status).toBe(502);
      expect(await gateway.json()).toEqual({ error: "Payment gateway error" });
      consoleError.mockRestore();
    });

    it("hides internal errors", async () => {
      const { POST } = await import("../../app/api/sponsor/cart/[cartId]/checkout/route");
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket hang up")));
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);

      const response = await POST(
        jsonRequest("POST", { ...checkoutBody, amount: MONTHLY_TOTAL }),
        params({ cartId: cart.id }),
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
      consoleError.mockRestore();
    });
  });
});
