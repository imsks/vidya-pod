"use client";

import { useCallback, useEffect, useState } from "react";
import { CART_FULL_MESSAGE, MAX_CART_LEARNERS } from "@/lib/sponsorship/cart-totals";
import { CartSummaryBar } from "./cart-summary-bar";
import { ChildCard, type CartToggle } from "./child-card";
import { SponsorHeader } from "./sponsor-header";
import type { AllLearnersResponse, LearnerStatusFilter, LearnerWithStatus } from "./types";
import { useSponsorshipCart } from "./use-sponsorship-cart";

const CART_LOCKED_REASON = "Your cart is locked while its payment is open.";

const PAGE_LIMIT = 12;

const FILTERS: { value: LearnerStatusFilter; label: string }[] = [
  { value: "available", label: "Ready for sponsorship" },
  { value: "sponsored", label: "Already sponsored" },
  { value: "all", label: "All children" },
];

const EMPTY_COPY: Record<LearnerStatusFilter, { icon: string; title: string; body: string }> = {
  all: {
    icon: "🌱",
    title: "No children yet",
    body: "We're onboarding the first pods. Check back soon.",
  },
  available: {
    icon: "🎉",
    title: "Every child is sponsored",
    body: "Thank you to all our sponsors. New children are added regularly.",
  },
  sponsored: {
    icon: "💛",
    title: "No sponsorships yet",
    body: "Be the first to fund a child's learning pod.",
  },
};

export const SponsorSelectPage = () => {
  const [filter, setFilter] = useState<LearnerStatusFilter>("available");
  const [learners, setLearners] = useState<LearnerWithStatus[]>([]);
  const [counts, setCounts] = useState<Record<LearnerStatusFilter, number>>({
    all: 0,
    available: 0,
    sponsored: 0,
  });
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sponsorshipCart = useSponsorshipCart();
  const { cart } = sponsorshipCart;

  const cartToggleFor = (learner: LearnerWithStatus): CartToggle => {
    const inCart = sponsorshipCart.isInCart(learner.id);
    const isFull = (cart?.items.length ?? 0) >= (cart?.limits.max_learners ?? MAX_CART_LEARNERS);
    const isLocked = Boolean(cart && !cart.can_edit);

    return {
      inCart,
      pending: sponsorshipCart.isPending(learner.id),
      // A locked cart blocks every change; a full cart only blocks adding more children.
      disabledReason: isLocked ? CART_LOCKED_REASON : isFull && !inCart ? CART_FULL_MESSAGE : null,
      onToggle: () =>
        void (inCart
          ? sponsorshipCart.removeLearner(learner.id)
          : sponsorshipCart.addLearner(learner.id)),
    };
  };

  const fetchLearners = useCallback(
    async (status: LearnerStatusFilter, pageNum: number, append: boolean) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError("");

        const res = await fetch(
          `/api/learner?status=${status}&limit=${PAGE_LIMIT}&page=${pageNum}`,
        );
        if (!res.ok) {
          throw new Error("Failed to load children");
        }

        const data: AllLearnersResponse = await res.json();
        setLearners((prev) => (append ? [...prev, ...data.data] : data.data));
        setCounts(data.counts);
        setHasNextPage(data.pagination.has_next_page);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load children");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchLearners(filter, 1, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchLearners, filter]);

  const renderGrid = () => {
    if (loading) {
      return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-card border border-border shadow-soft animate-pulse"
            >
              <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
              <div className="mt-4 h-5 bg-muted rounded w-3/4 mx-auto" />
              <div className="mt-2 h-4 bg-muted rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (learners.length === 0) {
      const copy = EMPTY_COPY[filter];
      return (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4">
            {copy.icon}
          </div>
          <p className="text-lg font-semibold">{copy.title}</p>
          <p className="text-muted-foreground mt-2">{copy.body}</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {learners.map((learner) => (
            <ChildCard
              key={learner.id}
              learner={learner}
              cartToggle={learner.is_sponsored ? undefined : cartToggleFor(learner)}
            />
          ))}
        </div>

        {hasNextPage && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => fetchLearners(filter, page + 1, true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold hover:border-primary/40 hover:shadow-soft transition-all disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load more children"}
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className={`max-w-7xl mx-auto px-6 py-16 ${cart?.items.length ? "pb-32" : ""}`}>
        <div className="text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Sponsor a Pod
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
            Choose a child to <span className="text-gradient">sponsor</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {counts.sponsored} of {counts.all} children are sponsored. Select one of the children
            below to begin funding their learning pod, or add several to your cart and sponsor them
            all with one payment.
          </p>
        </div>

        {sponsorshipCart.error && (
          <div
            role="alert"
            className="mt-8 mx-auto max-w-2xl flex items-start justify-between gap-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{sponsorshipCart.error}</span>
            <button
              type="button"
              onClick={sponsorshipCart.clearError}
              className="shrink-0 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-muted p-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  filter === option.value
                    ? "bg-foreground text-background shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
                <span className="ml-2 text-xs opacity-70">{counts[option.value]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12">{renderGrid()}</div>
      </main>

      {cart && <CartSummaryBar cart={cart} />}
    </div>
  );
};
