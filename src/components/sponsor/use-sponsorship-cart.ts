"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlanType } from "@/constants/pricing";
import {
  CART_NOT_FOUND_MESSAGE,
  CART_PAID_MESSAGE,
  type CartApiResponse,
  type CartCheckoutResponse,
  type CartErrorResponse,
  type CartResponse,
  type UnavailableCartLearner,
} from "@/lib/sponsorship/cart-types";

/** Only the cart id is kept in the browser; the cart itself lives on the server. */
export const CART_STORAGE_KEY = "vidyapod:sponsorship-cart-id";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

export interface DonorDetails {
  name: string;
  email: string;
  phone: string;
}

export class CartRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly unavailable: UnavailableCartLearner[] = [],
  ) {
    super(message);
    this.name = "CartRequestError";
  }
}

const readStoredCartId = (): string | null => {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeCartId = (cartId: string | null) => {
  try {
    if (cartId) {
      window.localStorage.setItem(CART_STORAGE_KEY, cartId);
    } else {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (e.g. blocked cookies); the cart then lasts for this page only.
  }
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const error = body as CartErrorResponse | null;
    throw new CartRequestError(error?.error || FALLBACK_ERROR, res.status, error?.unavailable);
  }

  return body as T;
};

const requestCart = async (url: string, init?: RequestInit): Promise<CartResponse> =>
  (await requestJson<CartApiResponse>(url, init)).data;

/** The stored cart can no longer change, so the browser should forget it. */
const isFinishedCartError = (error: unknown): error is CartRequestError =>
  error instanceof CartRequestError &&
  ((error.status === 404 && error.message === CART_NOT_FOUND_MESSAGE) ||
    (error.status === 409 && error.message === CART_PAID_MESSAGE));

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : FALLBACK_ERROR);

const withFullStop = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** Names the child and the reason when adding them was refused, instead of the generic cart message. */
const explainAddError = (error: unknown, learnerId: string): unknown => {
  if (!(error instanceof CartRequestError)) return error;
  const entry = error.unavailable.find((item) => item.learner_id === learnerId);
  if (!entry) return error;
  return new CartRequestError(
    `Couldn't add ${entry.name}. ${withFullStop(entry.message)}`,
    error.status,
    error.unavailable,
  );
};

/**
 * Client state for the multi-learner sponsorship cart. Requests run one at a time so quick
 * clicks cannot create two carts or apply changes out of order.
 */
export const useSponsorshipCart = () => {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingLearnerIds, setPendingLearnerIds] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const cartRef = useRef<CartResponse | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const applyCart = useCallback((next: CartResponse | null) => {
    // A paid cart is finished; the next selection starts a new one.
    const current = next && next.status !== "PAID" ? next : null;
    cartRef.current = current;
    storeCartId(current?.id ?? null);
    setCart(current);
  }, []);

  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(task, task);
    queue.current = result.catch(() => undefined);
    return result;
  }, []);

  const loadCart = useCallback(async () => {
    const cartId = cartRef.current?.id ?? readStoredCartId();

    if (!cartId) {
      applyCart(null);
      return;
    }

    try {
      applyCart(await requestCart(`/api/sponsor/cart/${encodeURIComponent(cartId)}`));
    } catch (err) {
      if (isFinishedCartError(err)) {
        applyCart(null);
        return;
      }
      throw err;
    }
  }, [applyCart]);

  const refresh = useCallback(
    () =>
      enqueue(async () => {
        try {
          await loadCart();
          return true;
        } catch (err) {
          setError(errorMessage(err));
          return false;
        }
      }),
    [enqueue, loadCart],
  );

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const mutate = useCallback(
    (learnerId: string | null, change: (cartId: string | null) => Promise<CartResponse | null>) => {
      if (learnerId) {
        setPendingLearnerIds((ids) => [...ids, learnerId]);
      }
      setPendingCount((count) => count + 1);
      setError("");

      return enqueue(async () => {
        try {
          applyCart(await change(cartRef.current?.id ?? null));
          return true;
        } catch (err) {
          if (isFinishedCartError(err)) {
            applyCart(null);
            if (err.message === CART_PAID_MESSAGE) setError(err.message);
            return false;
          }

          setError(errorMessage(err));
          // The cart may have changed elsewhere (another tab, a checkout); show its real state.
          await loadCart().catch(() => undefined);
          return false;
        } finally {
          if (learnerId) {
            setPendingLearnerIds((ids) => ids.filter((id) => id !== learnerId));
          }
          setPendingCount((count) => count - 1);
        }
      });
    },
    [applyCart, enqueue, loadCart],
  );

  const addLearner = useCallback(
    (learnerId: string) =>
      mutate(learnerId, async (cartId) => {
        try {
          if (cartId) {
            try {
              return await requestCart(`/api/sponsor/cart/${cartId}/items`, {
                method: "POST",
                body: JSON.stringify({ learner_id: learnerId }),
              });
            } catch (err) {
              if (!isFinishedCartError(err)) throw err;
            }
          }

          return await requestCart("/api/sponsor/cart", {
            method: "POST",
            body: JSON.stringify({ learner_ids: [learnerId] }),
          });
        } catch (err) {
          throw explainAddError(err, learnerId);
        }
      }),
    [mutate],
  );

  const removeLearner = useCallback(
    (learnerId: string) =>
      mutate(learnerId, async (cartId) =>
        cartId
          ? requestCart(`/api/sponsor/cart/${cartId}/items/${encodeURIComponent(learnerId)}`, {
              method: "DELETE",
            })
          : null,
      ),
    [mutate],
  );

  const setPlan = useCallback(
    (plan: PlanType) =>
      mutate(null, async (cartId) =>
        cartId
          ? requestCart(`/api/sponsor/cart/${cartId}`, {
              method: "PATCH",
              body: JSON.stringify({ plan }),
            })
          : null,
      ),
    [mutate],
  );

  /**
   * Opens one payment for every learner in the cart, charging the total the donor is shown.
   * Retrying with the same idempotency key returns the payment already started.
   */
  const checkout = useCallback(
    (donor: DonorDetails, idempotencyKey: string) =>
      enqueue(async () => {
        const current = cartRef.current;

        if (!current || current.items.length === 0) {
          throw new CartRequestError("Your cart is empty.", 400);
        }

        return requestJson<CartCheckoutResponse>(`/api/sponsor/cart/${current.id}/checkout`, {
          method: "POST",
          body: JSON.stringify({
            ...donor,
            plan: current.plan,
            amount: current.totals.total,
            idempotency_key: idempotencyKey,
          }),
        });
      }),
    [enqueue],
  );

  const isInCart = useCallback(
    (learnerId: string) => cart?.items.some((item) => item.learner_id === learnerId) ?? false,
    [cart],
  );

  return {
    cart,
    loading,
    error,
    clearError: useCallback(() => setError(""), []),
    updating: pendingCount > 0,
    isPending: useCallback(
      (learnerId: string) => pendingLearnerIds.includes(learnerId),
      [pendingLearnerIds],
    ),
    isInCart,
    addLearner,
    removeLearner,
    setPlan,
    checkout,
    refresh,
  };
};

/** Random key that lets a checkout request be retried safely; valid in insecure contexts too. */
export const createIdempotencyKey = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
