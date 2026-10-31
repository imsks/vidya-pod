import { describe, expect, it } from "vitest";
import { MONTHLY_TOTAL } from "@/constants/pricing";
import {
  CART_ORDER_PREFIX,
  buildCartLineOrderId,
  createCartOrderId,
  isCartOrderId,
  isValidUuid,
  parseCartCheckoutBody,
  parseCartItemBody,
  parseCreateCartBody,
  parseUpdateCartBody,
} from "@/lib/validation/sponsorship-cart";
import { createSponsorOrderId } from "@/lib/validation/sponsor";

const learnerId = (n: number) => `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`;

const validCheckout = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly",
  amount: MONTHLY_TOTAL * 2,
};

describe("parseCreateCartBody", () => {
  it("accepts an empty body so a cart can be created before any learner is picked", () => {
    expect(parseCreateCartBody(undefined)).toEqual({ success: true, data: {} });
    expect(parseCreateCartBody({})).toEqual({ success: true, data: {} });
  });

  it("accepts initial learners and a plan", () => {
    const result = parseCreateCartBody({
      learner_ids: [learnerId(1), learnerId(2)],
      plan: "yearly",
    });

    expect(result).toEqual({
      success: true,
      data: { learner_ids: [learnerId(1), learnerId(2)], plan: "yearly" },
    });
  });

  it("rejects duplicate learners", () => {
    const result = parseCreateCartBody({ learner_ids: [learnerId(1), learnerId(1)] });

    expect(result).toEqual({
      success: false,
      error: "Each learner can only be added once",
      status: 400,
    });
  });

  it("rejects more learners than one checkout allows", () => {
    const ids = Array.from({ length: 11 }, (_, i) => learnerId(i + 1));

    expect(parseCreateCartBody({ learner_ids: ids })).toEqual({
      success: false,
      error: "You can sponsor up to 10 learners in one checkout.",
      status: 400,
    });
  });

  it("rejects malformed learner ids and unknown plans", () => {
    expect(parseCreateCartBody({ learner_ids: ["nope"] })).toMatchObject({
      success: false,
      error: "Valid learner ID is required",
    });
    expect(parseCreateCartBody({ plan: "weekly" })).toMatchObject({ success: false, status: 400 });
  });
});

describe("parseCartItemBody", () => {
  it("requires a learner uuid", () => {
    expect(parseCartItemBody({ learner_id: learnerId(1) })).toEqual({
      success: true,
      data: { learner_id: learnerId(1) },
    });
    expect(parseCartItemBody({})).toMatchObject({ success: false, status: 400 });
    expect(parseCartItemBody(null)).toMatchObject({ success: false, status: 400 });
  });
});

describe("parseUpdateCartBody", () => {
  it("only accepts a supported plan", () => {
    expect(parseUpdateCartBody({ plan: "yearly" })).toEqual({
      success: true,
      data: { plan: "yearly" },
    });
    expect(parseUpdateCartBody({ plan: "daily" })).toMatchObject({ success: false, status: 400 });
  });
});

describe("parseCartCheckoutBody", () => {
  it("accepts donor details with an optional idempotency key", () => {
    expect(parseCartCheckoutBody(validCheckout)).toEqual({ success: true, data: validCheckout });

    const withKey = { ...validCheckout, idempotency_key: "3f1c2b8e-6a0d-4b0f-9a59-2d1d3c4b5a69" };
    expect(parseCartCheckoutBody(withKey)).toEqual({ success: true, data: withKey });
  });

  it("applies the same donor rules as single sponsorship", () => {
    expect(parseCartCheckoutBody({ ...validCheckout, email: "nope" })).toMatchObject({
      success: false,
      error: "Valid email is required",
    });
    expect(parseCartCheckoutBody({ ...validCheckout, name: "  " })).toMatchObject({
      success: false,
      error: "Name is required",
    });
    expect(parseCartCheckoutBody({ ...validCheckout, amount: 0 })).toMatchObject({
      success: false,
      error: "Amount must be positive",
    });
  });

  it("rejects malformed idempotency keys", () => {
    expect(parseCartCheckoutBody({ ...validCheckout, idempotency_key: "short" })).toMatchObject({
      success: false,
      error: "Idempotency key must be 8-128 letters, numbers, dashes or underscores",
    });
    expect(
      parseCartCheckoutBody({ ...validCheckout, idempotency_key: "has spaces in it" }),
    ).toMatchObject({ success: false });
  });
});

describe("cart order ids", () => {
  it("creates prefixed ids that are distinguishable from single sponsorship ids", () => {
    const orderId = createCartOrderId(1700000000000, () => 0.123456789);

    expect(orderId).toBe("VPC_1700000000000_4fzzzx");
    expect(orderId.startsWith(CART_ORDER_PREFIX)).toBe(true);
    expect(isCartOrderId(orderId)).toBe(true);
    expect(isCartOrderId(createSponsorOrderId(1700000000000, () => 0.5))).toBe(false);
  });

  it("derives one order id per learner from the shared payment order id", () => {
    expect(buildCartLineOrderId("VPC_1_abc", 1)).toBe("VPC_1_abc-1");
    expect(buildCartLineOrderId("VPC_1_abc", 10)).toBe("VPC_1_abc-10");
  });

  it("does not treat per-learner line ids as combined payment ids", () => {
    expect(isCartOrderId("VPC_1_abc")).toBe(true);
    expect(isCartOrderId(buildCartLineOrderId("VPC_1_abc", 1))).toBe(false);
    expect(isCartOrderId("VPC_")).toBe(false);
    expect(isCartOrderId("XVPC_1_abc")).toBe(false);
  });
});

describe("isValidUuid", () => {
  it("guards route params before they reach the database", () => {
    expect(isValidUuid(learnerId(1))).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
  });
});
