"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { CartItemResponse } from "@/lib/sponsorship/cart-types";
import { describeChildren, formatChildCount, formatRupees, planPeriod } from "./cart-format";
import { DonorPaymentForm } from "./donor-payment-form";
import { PricingPanel } from "./pricing-panel";
import { SponsorHeader } from "./sponsor-header";
import {
  CartRequestError,
  createIdempotencyKey,
  useSponsorshipCart,
  type DonorDetails,
} from "./use-sponsorship-cart";

const BackLink = () => (
  <Link
    href="/sponsor"
    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    ← Choose more children
  </Link>
);

interface CartRowProps {
  item: CartItemResponse;
  price: string;
  canEdit: boolean;
  pending: boolean;
  onRemove: () => void;
}

const CartRow = ({ item, price, canEdit, pending, onRemove }: CartRowProps) => (
  <li
    className={`flex items-center gap-4 p-4 rounded-2xl border bg-card ${
      item.available ? "border-border" : "border-destructive/40 bg-destructive/5"
    }`}
  >
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-warm shrink-0">
      {item.image_url ? (
        <Image src={item.image_url} alt={item.name} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl">🧒</div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-bold truncate">{item.name}</p>
      <p className="text-sm text-muted-foreground">
        Grade {item.standard}
        {item.available ? ` · ${price}` : ""}
      </p>
      {!item.available && item.message && (
        <p className="mt-1 text-sm font-semibold text-destructive">⚠ {item.message}</p>
      )}
    </div>
    <button
      type="button"
      onClick={onRemove}
      disabled={!canEdit || pending}
      className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-all hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
      <span className="sr-only"> {item.name}</span>
    </button>
  </li>
);

const Notice = ({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className={`mt-6 rounded-2xl px-5 py-4 text-sm ${
      tone === "error" ? "bg-destructive/10 text-destructive" : "bg-accent/15 text-foreground"
    }`}
  >
    {children}
  </div>
);

export const SponsorCartPage = () => {
  const sponsorshipCart = useSponsorshipCart();
  const { cart, loading, error } = sponsorshipCart;
  const idempotencyKey = useRef<string | null>(null);

  const startPayment = async (donor: DonorDetails) => {
    idempotencyKey.current ??= createIdempotencyKey();

    try {
      const result = await sponsorshipCart.checkout(donor, idempotencyKey.current);
      return result.paymentSessionId;
    } catch (err) {
      // A server answer ends this attempt; a network failure is retried with the same key so
      // a payment that did start is resumed rather than duplicated.
      if (err instanceof CartRequestError) {
        idempotencyKey.current = null;
        void sponsorshipCart.refresh();
      }
      throw err;
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="mt-10 space-y-3" aria-busy="true" aria-label="Loading your cart">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      );
    }

    if (!cart && error) {
      return (
        <div className="mt-10 text-center">
          <Notice tone="error">{error}</Notice>
          <button
            type="button"
            onClick={() => void sponsorshipCart.refresh()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Try again
          </button>
        </div>
      );
    }

    if (!cart || cart.items.length === 0) {
      return (
        <div className="mt-10 text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4">
            🛒
          </div>
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="text-muted-foreground mt-2">
            Add children from the list to sponsor them all with one payment.
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <Link
            href="/sponsor"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Choose children →
          </Link>
        </div>
      );
    }

    const unavailableCount = cart.items.filter((item) => !item.available).length;
    const pricePerChild = `${formatRupees(cart.totals.unit_amount)}/${planPeriod(cart.plan)}`;
    const payBlockedReason = !cart.can_edit
      ? "A payment is already open for this cart."
      : unavailableCount > 0
        ? `Remove ${unavailableCount === 1 ? "the child" : "the children"} marked above to continue.`
        : sponsorshipCart.updating
          ? "Updating your cart…"
          : null;

    return (
      <>
        {cart.status === "PENDING_PAYMENT" && (
          <Notice tone="info">
            <p className="font-semibold">A payment is in progress for this cart.</p>
            <p className="mt-1">
              The cart is locked until it finishes. If you closed the payment page, it unlocks again
              for changes after a few minutes.
            </p>
            <button
              type="button"
              onClick={() => void sponsorshipCart.refresh()}
              className="mt-3 font-semibold underline"
            >
              Check again
            </button>
          </Notice>
        )}

        {cart.status === "FAILED" && (
          <Notice tone="info">
            Your last payment didn&apos;t go through. Your cart is saved — review it and pay again.
          </Notice>
        )}

        {error && (
          <Notice tone="error">
            <div className="flex items-start justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={sponsorshipCart.clearError}
                className="shrink-0 font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          </Notice>
        )}

        <ul className="mt-8 space-y-3" aria-label="Children in your cart">
          {cart.items.map((item) => (
            <CartRow
              key={item.learner_id}
              item={item}
              price={pricePerChild}
              canEdit={cart.can_edit}
              pending={sponsorshipCart.isPending(item.learner_id)}
              onRemove={() => void sponsorshipCart.removeLearner(item.learner_id)}
            />
          ))}
        </ul>

        <div className="mt-10">
          <PricingPanel
            plan={cart.plan}
            onPlanChange={(plan) => void sponsorshipCart.setPlan(plan)}
            learnerCount={cart.totals.learner_count}
            disabled={!cart.can_edit || sponsorshipCart.updating}
          />
        </div>

        <div className="mt-8">
          <DonorPaymentForm
            amount={cart.totals.total}
            onSubmit={startPayment}
            disabled={payBlockedReason !== null}
            disabledReason={payBlockedReason}
            description={
              <>
                We use these details to link your sponsorship to{" "}
                <strong className="font-semibold text-foreground">
                  {describeChildren(cart.items.map((item) => item.name))}
                </strong>{" "}
                and to send you one receipt and progress updates. We never share them publicly.
              </>
            }
          />
        </div>
      </>
    );
  };

  const count = cart?.items.length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <BackLink />

        <div className="mt-8 text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Your cart
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
            {count > 0 ? (
              <>
                Sponsor <span className="text-gradient">{formatChildCount(count)}</span>
                {count > 1 && " at once"}
              </>
            ) : (
              <>
                Sponsor <span className="text-gradient">together</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            One payment covers every child below. Every rupee goes directly to teachers, books,
            stationery, and kids.
          </p>
        </div>

        {renderBody()}
      </main>
    </div>
  );
};
