import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeCartPayment,
  failCartPayment,
  summarizeCartPaymentStatus,
} from "@/lib/sponsorship/complete-cart";
import { createInMemoryPrisma, type InMemoryPrisma } from "../helpers/in-memory-prisma";

const ASHA = "550e8400-e29b-41d4-a716-446655440001";
const RAVI = "550e8400-e29b-41d4-a716-446655440002";
const MEERA = "550e8400-e29b-41d4-a716-446655440003";
const PAYMENT_ID = "VPC_1_abc";

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60_000);

let db: InMemoryPrisma;

const seedAttempt = (learnerIds: string[], overrides: Record<string, unknown> = {}) => {
  const cart = db.seedCart({
    status: "PENDING_PAYMENT",
    orderId: PAYMENT_ID,
    paymentSessionId: "session_1",
    amount: learnerIds.length * 300,
  });
  const orders = learnerIds.map((learnerId, index) =>
    db.seedOrder({
      orderId: `${PAYMENT_ID}-${index + 1}`,
      paymentOrderId: PAYMENT_ID,
      cartId: cart.id,
      learnerId,
      name: "Priya",
      email: "priya@example.com",
      ...overrides,
    }),
  );
  return { cart, orders };
};

describe("completeCartPayment", () => {
  beforeEach(() => {
    db = createInMemoryPrisma();
    db.seedLearner({ id: ASHA, name: "Asha" });
    db.seedLearner({ id: RAVI, name: "Ravi" });
    db.seedLearner({ id: MEERA, name: "Meera" });
  });

  it("settles every learner in the payment under one sponsor", async () => {
    const { cart, orders } = seedAttempt([ASHA, RAVI]);

    const result = await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(result).toMatchObject({ success: true, status: "SUCCESS", alreadyCompleted: false });
    expect(db.tables.sponsor).toHaveLength(1);
    const [sponsor] = db.tables.sponsor;
    expect(sponsor).toMatchObject({ name: "Priya", email: "priya@example.com" });
    for (const order of orders) {
      expect(order).toMatchObject({ status: "SUCCESS", sponsorId: sponsor.id });
      expect(order.shareSlug).toEqual(expect.any(String));
    }
    for (const learner of db.tables.learner.filter((row) => row.id !== MEERA)) {
      expect(learner.sponsorId).toBe(sponsor.id);
      expect(learner.sponsorshipEndsAt).toBeInstanceOf(Date);
    }
    expect(db.tables.learner.find((row) => row.id === MEERA)?.sponsorId).toBeNull();
    expect(cart.status).toBe("PAID");
    if (result.success) {
      expect(result.orders.map((order) => order.orderId)).toEqual([
        `${PAYMENT_ID}-1`,
        `${PAYMENT_ID}-2`,
      ]);
    }
  });

  it("reuses an existing sponsor with the same email", async () => {
    const existing = db.seedSponsor({ name: "Priya", email: "priya@example.com" });
    const { orders } = seedAttempt([ASHA]);

    await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(db.tables.sponsor).toHaveLength(1);
    expect(orders[0].sponsorId).toBe(existing.id);
  });

  it("settles holds that lapsed or failed before the payment was captured", async () => {
    const { orders } = seedAttempt([ASHA, RAVI]);
    orders[0].status = "EXPIRED";
    orders[1].status = "FAILED";

    await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(orders.map((order) => order.status)).toEqual(["SUCCESS", "SUCCESS"]);
  });

  it("never overwrites a learner another donor is actively sponsoring", async () => {
    const rival = db.seedSponsor({ name: "Rival", email: "rival@example.com" });
    const ravi = db.tables.learner.find((row) => row.id === RAVI)!;
    const endsAt = daysFromNow(20);
    Object.assign(ravi, { sponsorId: rival.id, sponsorshipEndsAt: endsAt });
    const { orders } = seedAttempt([ASHA, RAVI]);

    await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(orders[1].status).toBe("SUCCESS");
    expect(ravi).toMatchObject({ sponsorId: rival.id, sponsorshipEndsAt: endsAt });
    expect(db.tables.learner.find((row) => row.id === ASHA)?.sponsorId).not.toBe(rival.id);
  });

  it("treats a repeated success callback as already completed", async () => {
    const { orders } = seedAttempt([ASHA, RAVI]);
    await completeCartPayment(db.prisma, PAYMENT_ID);
    const slugs = orders.map((order) => order.shareSlug);
    const transaction = vi.spyOn(db.client, "$transaction");

    const result = await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(result).toMatchObject({ success: true, status: "SUCCESS", alreadyCompleted: true });
    expect(transaction).not.toHaveBeenCalled();
    expect(orders.map((order) => order.shareSlug)).toEqual(slugs);
    expect(db.tables.sponsor).toHaveLength(1);
  });

  it("skips a learner that a concurrent callback already settled", async () => {
    const { orders } = seedAttempt([ASHA, RAVI]);
    const updateMany = db.client.sponsorOrder.updateMany;
    const learnerUpdate = vi.spyOn(db.client.learner, "update");
    vi.spyOn(db.client.sponsorOrder, "updateMany").mockImplementationOnce(async (args) => {
      orders[0].status = "SUCCESS";
      return updateMany(args);
    });

    const result = await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(result.success).toBe(true);
    expect(learnerUpdate).toHaveBeenCalledTimes(1);
    expect(learnerUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: RAVI } }));
  });

  it("only marks the carts of this payment as paid", async () => {
    const { cart } = seedAttempt([ASHA]);
    const otherCart = db.seedCart({ status: "PENDING_PAYMENT", orderId: "VPC_2_other" });

    await completeCartPayment(db.prisma, PAYMENT_ID);

    expect(cart.status).toBe("PAID");
    expect(otherCart.status).toBe("PENDING_PAYMENT");
  });

  it("reports an unknown payment id", async () => {
    await expect(completeCartPayment(db.prisma, "VPC_9_missing")).resolves.toEqual({
      success: false,
      reason: "order_not_found",
    });
  });
});

describe("failCartPayment", () => {
  beforeEach(() => {
    db = createInMemoryPrisma();
    db.seedLearner({ id: ASHA, name: "Asha" });
    db.seedLearner({ id: RAVI, name: "Ravi" });
  });

  it("releases every learner and unlocks the cart for a retry", async () => {
    const { cart, orders } = seedAttempt([ASHA, RAVI]);
    orders[1].status = "EXPIRED";

    const result = await failCartPayment(db.prisma, PAYMENT_ID);

    expect(result).toMatchObject({ success: true, status: "FAILED", alreadyCompleted: false });
    expect(orders.map((order) => order.status)).toEqual(["FAILED", "FAILED"]);
    expect(cart).toMatchObject({ status: "FAILED", paymentSessionId: null });
    expect(db.tables.learner.every((learner) => learner.sponsorId === null)).toBe(true);
  });

  it("never overrides a captured payment", async () => {
    const { cart, orders } = seedAttempt([ASHA, RAVI]);
    await completeCartPayment(db.prisma, PAYMENT_ID);

    const result = await failCartPayment(db.prisma, PAYMENT_ID);

    expect(result).toMatchObject({ success: true, status: "SUCCESS", alreadyCompleted: true });
    expect(orders.map((order) => order.status)).toEqual(["SUCCESS", "SUCCESS"]);
    expect(cart.status).toBe("PAID");
  });

  it("leaves the cart alone when it has moved on to a newer attempt", async () => {
    const { cart, orders } = seedAttempt([ASHA]);
    Object.assign(cart, { orderId: "VPC_2_newer", paymentSessionId: "session_2" });

    await failCartPayment(db.prisma, PAYMENT_ID);

    expect(orders[0].status).toBe("FAILED");
    expect(cart).toMatchObject({
      status: "PENDING_PAYMENT",
      orderId: "VPC_2_newer",
      paymentSessionId: "session_2",
    });
  });

  it("treats a repeated failure callback as already completed", async () => {
    seedAttempt([ASHA]);
    await failCartPayment(db.prisma, PAYMENT_ID);

    const result = await failCartPayment(db.prisma, PAYMENT_ID);

    expect(result).toMatchObject({ success: true, status: "FAILED", alreadyCompleted: true });
  });

  it("reports an unknown payment id", async () => {
    await expect(failCartPayment(db.prisma, "VPC_9_missing")).resolves.toEqual({
      success: false,
      reason: "order_not_found",
    });
  });
});

describe("summarizeCartPaymentStatus", () => {
  it.each([
    [["FAILED", "SUCCESS"], "SUCCESS"],
    [["EXPIRED", "PENDING"], "PENDING"],
    [["EXPIRED", "FAILED"], "FAILED"],
    [["EXPIRED", "EXPIRED"], "EXPIRED"],
  ] as const)("summarizes %j as %s", (statuses, expected) => {
    expect(summarizeCartPaymentStatus([...statuses])).toBe(expected);
  });
});
