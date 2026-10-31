import type { PlanType } from "@/constants/pricing";

/**
 * JSON contract of the sponsorship cart APIs. Kept free of server imports so client
 * components can share it.
 */

export type CartStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "FAILED";

export type CartLearnerUnavailableReason = "already_sponsored" | "pending_order";

export interface CartItemResponse {
  learner_id: string;
  name: string;
  standard: string;
  image_url: string | null;
  /** Availability is only evaluated while the cart can still be edited. */
  available: boolean;
  unavailable_reason: CartLearnerUnavailableReason | null;
  message: string | null;
}

export interface CartResponse {
  id: string;
  status: CartStatus;
  plan: PlanType;
  /** Combined payment order of the latest checkout attempt. */
  order_id: string | null;
  can_edit: boolean;
  items: CartItemResponse[];
  totals: {
    learner_count: number;
    unit_amount: number;
    total: number;
  };
  limits: {
    min_learners: number;
    max_learners: number;
  };
}

export interface UnavailableCartLearner {
  learner_id: string;
  name: string;
  reason: CartLearnerUnavailableReason;
  message: string;
}

export interface CartApiResponse {
  success: true;
  data: CartResponse;
}

export interface CartErrorResponse {
  error: string;
  unavailable?: UnavailableCartLearner[];
}

export interface CartCheckoutResponse {
  orderId: string;
  paymentSessionId: string;
  amount: number;
  /** True when an idempotent retry returned the session of an attempt already in progress. */
  replayed: boolean;
}
