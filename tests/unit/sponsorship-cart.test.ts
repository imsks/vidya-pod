import { beforeEach, describe, expect, it, vi } from "vitest";
import { MONTHLY_TOTAL, YEARLY_TOTAL } from "@/constants/pricing";
import { createInMemoryPrisma, type InMemoryPrisma } from "../helpers/in-memory-prisma";

vi.mock("@/lib/cashfree/sync-sponsor-order", () => ({
  syncSponsorOrderFromCashfree: vi.fn().mockResolvedValue(false),
}));

const ASHA = "550e8400-e29b-41d4-a716-446655440001";
const RAVI = "550e8400-e29b-41d4-a716-446655440002";
const MEERA = "550e8400-e29b-41d4-a716-446655440003";
const MISSING = "550e8400-e29b-41d4-a716-446655440099";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

let db: InMemoryPrisma;

const loadCartService = () => import("@/lib/sponsorship/cart");

describe("sponsorship cart service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPONSORSHIP_RESERVATION_MINUTES;
    db = createInMemoryPrisma();
    db.seedLearner({ id: ASHA, name: "Asha", standard: "4" });
    db.seedLearner({ id: RAVI, name: "Ravi", standard: "6" });
    db.seedLearner({ id: MEERA, name: "Meera", standard: "7" });
  });

  describe("createCart", () => {
    it("creates an empty draft cart with server-computed totals and limits", async () => {
      const { createCart } = await loadCartService();

      const result = await createCart(db.prisma, {});

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toMatchObject({
        status: "DRAFT",
        plan: "monthly",
        order_id: null,
        can_edit: true,
        items: [],
        totals: { learner_count: 0, unit_amount: MONTHLY_TOTAL, total: 0 },
        limits: { min_learners: 1, max_learners: 10 },
      });
      expect(db.tables.sponsorshipCart).toHaveLength(1);
    });

    it("adds the initial learners in order on the requested plan", async () => {
      const { createCart } = await loadCartService();

      const result = await createCart(db.prisma, { learner_ids: [RAVI, ASHA], plan: "yearly" });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.items).toEqual([
        {
          learner_id: RAVI,
          name: "Ravi",
          standard: "6",
          image_url: null,
          available: true,
          unavailable_reason: null,
          message: null,
        },
        expect.objectContaining({ learner_id: ASHA, name: "Asha" }),
      ]);
      expect(result.data.totals).toEqual({
        learner_count: 2,
        unit_amount: YEARLY_TOTAL,
        total: YEARLY_TOTAL * 2,
      });
    });

    it("rejects unknown learners", async () => {
      const { createCart } = await loadCartService();

      await expect(createCart(db.prisma, { learner_ids: [ASHA, MISSING] })).resolves.toEqual({
        ok: false,
        status: 404,
        error: "Learner not found",
      });
      expect(db.tables.sponsorshipCart).toHaveLength(0);
    });

    it("lists every learner that cannot be sponsored", async () => {
      const { createCart } = await loadCartService();
      db.tables.learner[0].sponsorId = "sponsor-1";
      db.seedOrder({ orderId: "VP_other", learnerId: RAVI });

      const result = await createCart(db.prisma, { learner_ids: [ASHA, RAVI, MEERA] });

      expect(result).toEqual({
        ok: false,
        status: 409,
        error: "Some learners are no longer available. Remove them to continue.",
        unavailable: [
          {
            learner_id: ASHA,
            name: "Asha",
            reason: "already_sponsored",
            message: "This learner is already sponsored",
          },
          {
            learner_id: RAVI,
            name: "Ravi",
            reason: "pending_order",
            message:
              "Someone is checking out for this learner right now. Please try again in a minute.",
          },
        ],
      });
      expect(db.tables.sponsorshipCart).toHaveLength(0);
    });
  });

  describe("getCart", () => {
    it("returns 404 for unknown carts", async () => {
      const { getCart } = await loadCartService();

      await expect(getCart(db.prisma, MISSING)).resolves.toEqual({
        ok: false,
        status: 404,
        error: "Cart not found",
      });
    });

    it("flags learners that became unavailable after they were added", async () => {
      const { getCart } = await loadCartService();
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);
      db.seedCartItem(cart.id, RAVI);
      db.tables.learner[1].sponsorId = "sponsor-1";

      const result = await getCart(db.prisma, cart.id);

      expect(result.ok && result.data.items).toEqual([
        expect.objectContaining({ learner_id: ASHA, available: true }),
        expect.objectContaining({
          learner_id: RAVI,
          available: false,
          unavailable_reason: "already_sponsored",
          message: "This learner is already sponsored",
        }),
      ]);
    });

    it("does not evaluate availability while the cart's own payment holds its learners", async () => {
      const { getCart } = await loadCartService();
      const cart = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        checkoutStartedAt: new Date(),
      });
      db.seedCartItem(cart.id, ASHA);
      db.seedOrder({ orderId: "VPC_1_abc-1", paymentOrderId: "VPC_1_abc", learnerId: ASHA });

      const result = await getCart(db.prisma, cart.id);

      expect(result.ok && result.data).toMatchObject({
        status: "PENDING_PAYMENT",
        order_id: "VPC_1_abc",
        can_edit: false,
        items: [expect.objectContaining({ learner_id: ASHA, available: true })],
      });
    });
  });

  describe("addCartItem", () => {
    it("adds an available learner", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();

      const result = await addCartItem(db.prisma, cart.id, ASHA);

      expect(result.ok && result.data.totals.learner_count).toBe(1);
      expect(db.tables.sponsorshipCartItem).toEqual([
        expect.objectContaining({ cartId: cart.id, learnerId: ASHA }),
      ]);
    });

    it("prevents adding the same learner twice", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);

      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toEqual({
        ok: false,
        status: 409,
        error: "This learner is already in your cart",
      });
      expect(db.tables.sponsorshipCartItem).toHaveLength(1);
    });

    it("treats a concurrent duplicate insert as a duplicate", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      vi.spyOn(db.client.sponsorshipCartItem, "create").mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
      );

      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toMatchObject({
        ok: false,
        status: 409,
        error: "This learner is already in your cart",
      });
    });

    it("rethrows unexpected database errors", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      vi.spyOn(db.client.sponsorshipCartItem, "create").mockRejectedValueOnce(new Error("down"));

      await expect(addCartItem(db.prisma, cart.id, ASHA)).rejects.toThrow("down");
    });

    it("stops at the maximum number of learners", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      for (let i = 0; i < 10; i += 1) {
        const id = `550e8400-e29b-41d4-a716-4466554401${String(i).padStart(2, "0")}`;
        db.seedLearner({ id, name: `Learner ${i}` });
        db.seedCartItem(cart.id, id);
      }

      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toEqual({
        ok: false,
        status: 409,
        error: "You can sponsor up to 10 learners in one checkout.",
      });
    });

    it("removes its own item when a parallel add overfilled the cart", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      for (let i = 0; i < 9; i += 1) {
        const id = `550e8400-e29b-41d4-a716-4466554401${String(i).padStart(2, "0")}`;
        db.seedLearner({ id, name: `Learner ${i}` });
        db.seedCartItem(cart.id, id);
      }
      const create = db.client.sponsorshipCartItem.create;
      vi.spyOn(db.client.sponsorshipCartItem, "create").mockImplementationOnce(async (args) => {
        db.seedCartItem(cart.id, RAVI);
        return create(args);
      });

      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toMatchObject({
        status: 409,
        error: "You can sponsor up to 10 learners in one checkout.",
      });
      expect(db.tables.sponsorshipCartItem.map((item) => item.learnerId)).not.toContain(ASHA);
    });

    it("removes its own item when checkout locked the cart during the insert", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      const create = db.client.sponsorshipCartItem.create;
      vi.spyOn(db.client.sponsorshipCartItem, "create").mockImplementationOnce(async (args) => {
        cart.status = "PENDING_PAYMENT";
        cart.orderId = "VPC_1_abc";
        cart.checkoutStartedAt = new Date();
        return create(args);
      });

      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toEqual({
        ok: false,
        status: 409,
        error:
          "A payment is already in progress for this cart. Please wait a minute and try again.",
      });
      expect(db.tables.sponsorshipCartItem).toHaveLength(0);
    });

    it("rejects unknown and unavailable learners", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart();
      db.tables.learner[0].sponsorId = "sponsor-1";

      await expect(addCartItem(db.prisma, cart.id, MISSING)).resolves.toMatchObject({
        status: 404,
        error: "Learner not found",
      });
      await expect(addCartItem(db.prisma, cart.id, ASHA)).resolves.toMatchObject({
        status: 409,
        error: "This learner is already sponsored",
      });
    });

    it("returns 404 for unknown carts", async () => {
      const { addCartItem } = await loadCartService();

      await expect(addCartItem(db.prisma, MISSING, ASHA)).resolves.toMatchObject({
        status: 404,
        error: "Cart not found",
      });
    });

    it("refuses changes while a payment is running or after it succeeded", async () => {
      const { addCartItem } = await loadCartService();
      const paying = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        checkoutStartedAt: new Date(),
      });
      const paid = db.seedCart({ status: "PAID", orderId: "VPC_2_abc" });

      await expect(addCartItem(db.prisma, paying.id, ASHA)).resolves.toMatchObject({
        status: 409,
        error:
          "A payment is already in progress for this cart. Please wait a minute and try again.",
      });
      await expect(addCartItem(db.prisma, paid.id, ASHA)).resolves.toMatchObject({
        status: 409,
        error: "This cart has already been paid for. Start a new cart to sponsor more learners.",
      });
    });

    it("turns a failed cart back into a draft when it is edited", async () => {
      const { addCartItem } = await loadCartService();
      const cart = db.seedCart({ status: "FAILED", orderId: "VPC_1_abc" });

      const result = await addCartItem(db.prisma, cart.id, ASHA);

      expect(result.ok && result.data.status).toBe("DRAFT");
    });
  });

  describe("removeCartItem", () => {
    it("removes the learner and recomputes totals", async () => {
      const { removeCartItem } = await loadCartService();
      const cart = db.seedCart();
      db.seedCartItem(cart.id, ASHA);
      db.seedCartItem(cart.id, RAVI);

      const result = await removeCartItem(db.prisma, cart.id, ASHA);

      expect(result.ok && result.data.items.map((item) => item.learner_id)).toEqual([RAVI]);
      expect(result.ok && result.data.totals.total).toBe(MONTHLY_TOTAL);
    });

    it("is idempotent", async () => {
      const { removeCartItem } = await loadCartService();
      const cart = db.seedCart();

      const result = await removeCartItem(db.prisma, cart.id, ASHA);

      expect(result.ok && result.data.items).toEqual([]);
    });

    it("refuses changes to locked carts and unknown carts", async () => {
      const { removeCartItem } = await loadCartService();
      const paid = db.seedCart({ status: "PAID", orderId: "VPC_2_abc" });

      await expect(removeCartItem(db.prisma, paid.id, ASHA)).resolves.toMatchObject({
        status: 409,
      });
      await expect(removeCartItem(db.prisma, MISSING, ASHA)).resolves.toMatchObject({
        status: 404,
      });
    });
  });

  describe("updateCart", () => {
    it("switches the plan for every learner", async () => {
      const { updateCart } = await loadCartService();
      const cart = db.seedCart({ status: "FAILED" });
      db.seedCartItem(cart.id, ASHA);
      db.seedCartItem(cart.id, RAVI);

      const result = await updateCart(db.prisma, cart.id, { plan: "yearly" });

      expect(result.ok && result.data).toMatchObject({
        status: "DRAFT",
        plan: "yearly",
        totals: { learner_count: 2, unit_amount: YEARLY_TOTAL, total: YEARLY_TOTAL * 2 },
      });
    });

    it("refuses changes to locked carts and unknown carts", async () => {
      const { updateCart } = await loadCartService();
      const paid = db.seedCart({ status: "PAID", orderId: "VPC_2_abc" });

      await expect(updateCart(db.prisma, paid.id, { plan: "yearly" })).resolves.toMatchObject({
        status: 409,
        error: "This cart has already been paid for. Start a new cart to sponsor more learners.",
      });
      await expect(updateCart(db.prisma, MISSING, { plan: "yearly" })).resolves.toMatchObject({
        status: 404,
      });
      expect(paid.plan).toBe("monthly");
    });
  });

  describe("refreshCartPaymentState", () => {
    it("unlocks a cart whose checkout attempt was abandoned", async () => {
      const { refreshCartPaymentState } = await loadCartService();
      const cart = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        paymentSessionId: "session_1",
        checkoutStartedAt: minutesAgo(5),
      });
      const hold = db.seedOrder({
        orderId: "VPC_1_abc-1",
        paymentOrderId: "VPC_1_abc",
        learnerId: ASHA,
        createdAt: minutesAgo(5),
      });

      await refreshCartPaymentState(db.prisma, cart.id);

      expect(cart).toMatchObject({ status: "DRAFT", paymentSessionId: null });
      expect(hold.status).toBe("EXPIRED");
    });

    it("unlocks a cart whose attempt never reserved a learner", async () => {
      const { refreshCartPaymentState } = await loadCartService();
      const cart = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        checkoutStartedAt: minutesAgo(5),
      });

      await refreshCartPaymentState(db.prisma, cart.id);

      expect(cart.status).toBe("DRAFT");
    });

    it("keeps the lock while the attempt is inside its reservation window", async () => {
      const { refreshCartPaymentState } = await loadCartService();
      const cart = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        checkoutStartedAt: new Date(),
      });

      await refreshCartPaymentState(db.prisma, cart.id);

      expect(cart.status).toBe("PENDING_PAYMENT");
    });

    it("keeps the lock while any learner hold is still active", async () => {
      const { refreshCartPaymentState } = await loadCartService();
      const cart = db.seedCart({
        status: "PENDING_PAYMENT",
        orderId: "VPC_1_abc",
        checkoutStartedAt: minutesAgo(5),
      });
      db.seedOrder({ orderId: "VPC_1_abc-1", paymentOrderId: "VPC_1_abc", learnerId: ASHA });

      await refreshCartPaymentState(db.prisma, cart.id);

      expect(cart.status).toBe("PENDING_PAYMENT");
    });

    it("ignores carts that are not waiting for payment", async () => {
      const { refreshCartPaymentState } = await loadCartService();
      const cart = db.seedCart({ status: "PAID", orderId: "VPC_1_abc" });
      const updateMany = vi.spyOn(db.client.sponsorshipCart, "updateMany");

      await refreshCartPaymentState(db.prisma, cart.id);
      await refreshCartPaymentState(db.prisma, MISSING);

      expect(updateMany).not.toHaveBeenCalled();
    });
  });
});
