import { z } from "zod";
import { MAX_CART_LEARNERS } from "@/lib/sponsorship/cart-totals";
import { sponsorPlans, sponsorSchema } from "./sponsor";

/** Prefix that marks a Cashfree order as a combined payment for a sponsorship cart. */
export const CART_ORDER_PREFIX = "VPC_";

const learnerIdSchema = z.string().uuid("Valid learner ID is required");

export const createCartSchema = z.object({
  learner_ids: z
    .array(learnerIdSchema)
    .max(MAX_CART_LEARNERS, `You can sponsor up to ${MAX_CART_LEARNERS} learners in one checkout.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each learner can only be added once")
    .optional(),
  plan: z.enum(sponsorPlans).optional(),
});

export const cartItemSchema = z.object({
  learner_id: learnerIdSchema,
});

export const updateCartSchema = z.object({
  plan: z.enum(sponsorPlans),
});

export const cartCheckoutSchema = sponsorSchema
  .pick({ name: true, email: true, phone: true, plan: true, amount: true })
  .extend({
    idempotency_key: z
      .string()
      .regex(
        /^[A-Za-z0-9_-]{8,128}$/,
        "Idempotency key must be 8-128 letters, numbers, dashes or underscores",
      )
      .optional(),
  });

export type CreateCartInput = z.infer<typeof createCartSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type CartCheckoutInput = z.infer<typeof cartCheckoutSchema>;

export type CartParseResult<T> =
  { success: true; data: T } | { success: false; error: string; status: 400 };

const parseWith =
  <T>(schema: z.ZodType<T>, fallbackMessage: string) =>
  (body: unknown): CartParseResult<T> => {
    const result = schema.safeParse(body ?? {});

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? fallbackMessage;
      return { success: false, error: message, status: 400 };
    }

    return { success: true, data: result.data };
  };

export const parseCreateCartBody = parseWith(createCartSchema, "Invalid cart payload");
export const parseCartItemBody = parseWith(cartItemSchema, "Invalid cart item payload");
export const parseUpdateCartBody = parseWith(updateCartSchema, "Invalid cart payload");
export const parseCartCheckoutBody = parseWith(cartCheckoutSchema, "Invalid checkout payload");

/** Route params are user input; anything that is not a UUID can never match a cart or learner. */
export const isValidUuid = (value: string): boolean => z.string().uuid().safeParse(value).success;

export const createCartOrderId = (now = Date.now(), random = Math.random): string =>
  `${CART_ORDER_PREFIX}${now}_${random().toString(36).slice(2, 8)}`;

export const isCartOrderId = (orderId: string): boolean => orderId.startsWith(CART_ORDER_PREFIX);

/** Each learner in a combined payment keeps its own order row, keyed off the shared order id. */
export const buildCartLineOrderId = (paymentOrderId: string, position: number): string =>
  `${paymentOrderId}-${position}`;
