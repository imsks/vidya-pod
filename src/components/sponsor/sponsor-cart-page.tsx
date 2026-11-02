"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PlanType } from "@/constants/pricing";
import { PricingPanel } from "./pricing-panel";
import { SponsorHeader } from "./sponsor-header";
import { SponsorPaymentForm } from "./sponsor-payment-form";
import type { UnavailableLearner } from "./types";
import { useSponsorCart } from "./use-sponsor-cart";

const describeChildren = (names: string[]) =>
  names.length > 3
    ? `${names.length} children`
    : names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export const SponsorCartPage = () => {
  const cart = useSponsorCart();
  const [plan, setPlan] = useState<PlanType>("monthly");
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});

  const hasUnavailable = cart.items.some((item) => unavailable[item.id]);

  const markUnavailable = (learners: UnavailableLearner[]) =>
    setUnavailable(Object.fromEntries(learners.map((l) => [l.learner_id, l.message])));

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link
          href="/sponsor"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Choose more children
        </Link>

        <div className="mt-8 text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Your list
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
            Sponsor <span className="text-gradient">together</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            One payment covers every child below. Every rupee goes directly to teachers, books,
            stationery, and kids.
          </p>
        </div>

        {cart.items.length === 0 ? (
          <div className="mt-10 text-center py-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4">
              �
            </div>
            <p className="text-lg font-semibold">Your list is empty</p>
            <p className="text-muted-foreground mt-2">
              Add children to your list to sponsor them all with one payment.
            </p>
            <Link
              href="/sponsor"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
            >
              Choose children →
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-10 space-y-4" aria-label="Children in your list">
              {cart.items.map((item) => (
                <li
                  key={item.id}
                  className={`flex overflow-hidden rounded-3xl border bg-card shadow-soft ${
                    unavailable[item.id]
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-primary/20"
                  }`}
                >
                  <div className="relative min-h-32 w-24 shrink-0 bg-gradient-warm sm:min-h-44 sm:w-32">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="(min-width: 640px) 128px, 96px"
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">
                        🧒
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-black sm:text-2xl">
                        {item.name}
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                        Grade {item.standard}
                      </span>
                      {unavailable[item.id] && (
                        <p className="mt-2 text-sm font-semibold text-destructive">
                          ⚠ {unavailable[item.id]}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.remove([item.id])}
                      className="w-fit shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-all hover:border-destructive hover:text-destructive"
                    >
                      Remove<span className="sr-only"> {item.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <PricingPanel plan={plan} onPlanChange={setPlan} learnerCount={cart.items.length} />
            </div>

            <div className="mt-8">
              <SponsorPaymentForm
                learnerIds={cart.items.map((item) => item.id)}
                learnerName={describeChildren(cart.items.map((item) => item.name))}
                plan={plan}
                disabled={hasUnavailable}
                onUnavailable={markUnavailable}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
