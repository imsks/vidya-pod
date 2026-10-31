import Link from "next/link";
import type { CartResponse } from "@/lib/sponsorship/cart-types";
import { formatChildCount, formatRupees, planPeriod } from "./cart-format";

interface CartSummaryBarProps {
  cart: CartResponse;
}

/** Sticky reminder of the children collected so far, with the way into the cart. */
export const CartSummaryBar = ({ cart }: CartSummaryBarProps) => {
  const { learner_count: count, total } = cart.totals;

  if (count === 0) {
    return null;
  }

  const isFull = count >= cart.limits.max_learners;

  return (
    <section
      aria-label="Sponsorship cart"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-lg"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm sm:text-base">
          <strong className="font-bold">{formatChildCount(count)} selected</strong>
          <span className="text-muted-foreground">
            {" "}
            · {formatRupees(total)}/{planPeriod(cart.plan)}
          </span>
          {isFull && <span className="ml-2 text-xs text-muted-foreground">(cart is full)</span>}
        </p>
        <Link
          href="/sponsor/cart"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:shadow-lift"
        >
          Review cart →
        </Link>
      </div>
    </section>
  );
};
