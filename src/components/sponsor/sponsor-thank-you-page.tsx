"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SponsorHeader } from "./sponsor-header";
import { SponsorshipShareCard } from "./sponsorship-share-card";
import type { SponsorOrderStatusResponse } from "./types";
import { removeFromSponsorCart } from "./use-sponsor-cart";

const POLL_INTERVAL_MS = 3000;

const formatSupportedUntil = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export const SponsorThankYouPage = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [orderStatus, setOrderStatus] = useState<SponsorOrderStatusResponse["data"] | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/sponsor/${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch order status");
        }

        const data: SponsorOrderStatusResponse = await res.json();
        setOrderStatus(data.data);
        setError("");

        if (data.data.status === "SUCCESS") {
          removeFromSponsorCart(data.data.learners.map((learner) => learner.id));
        }

        if (data.data.status === "SUCCESS" || data.data.status === "FAILED") {
          return true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch order status");
      } finally {
        setLoading(false);
      }

      return false;
    };

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startPolling = async () => {
      const isTerminal = await fetchStatus();
      if (isTerminal) {
        return;
      }

      intervalId = setInterval(async () => {
        const done = await fetchStatus();
        if (done && intervalId) {
          clearInterval(intervalId);
        }
      }, POLL_INTERVAL_MS);
    };

    const timer = window.setTimeout(() => {
      void startPolling();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold">Invalid request</h1>
          <p className="mt-3 text-muted-foreground">No order ID was provided.</p>
          <Link
            href="/sponsor"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            ← Back to sponsor
          </Link>
        </div>
      </div>
    );
  }

  const isSuccess = orderStatus?.status === "SUCCESS";
  const isFailed = orderStatus?.status === "FAILED";
  const isPending = !isSuccess && !isFailed;
  const learners = orderStatus?.learners ?? [];
  const [firstLearner] = learners;
  const isMultiple = learners.length > 1;

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-14">
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                isFailed ? "bg-destructive/20" : "bg-accent/20"
              }`}
            >
              {isFailed ? "😔" : isSuccess ? "🎉" : "⏳"}
            </div>

            <h1 className="mt-5 font-display text-3xl font-black sm:text-4xl">
              {isFailed ? "Payment Failed" : isSuccess ? "Thank You!" : "Processing Payment"}
            </h1>

            {loading && !orderStatus && (
              <p className="mt-3 text-muted-foreground">Checking your payment status...</p>
            )}

            {error && <p className="mt-3 text-destructive">{error}</p>}

            {isPending && orderStatus && (
              <p className="mt-3 text-muted-foreground">
                Your payment is being verified. This page updates automatically.
              </p>
            )}

            {isFailed && (
              <p className="mt-3 text-muted-foreground">
                Your payment could not be completed. Please try again.
              </p>
            )}

            {isSuccess && orderStatus && firstLearner && (
              <>
                {isMultiple ? (
                  <>
                    <p className="mt-3 text-muted-foreground">
                      You&apos;re now sponsoring the education of{" "}
                      <strong className="font-semibold text-primary">
                        {learners.length} children
                      </strong>{" "}
                      with one payment.
                    </p>
                    <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
                      {learners.map((learner) => (
                        <li
                          key={learner.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-xl border border-border bg-card px-4 py-3"
                        >
                          <span>
                            <strong className="font-semibold">{learner.name}</strong>
                            <span className="text-sm text-muted-foreground">
                              {" "}
                              · Grade {learner.standard}
                            </span>
                          </span>
                          {learner.sponsored_until && (
                            <span className="text-xs text-muted-foreground">
                              Supported until {formatSupportedUntil(learner.sponsored_until)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-muted-foreground">
                      You&apos;re now sponsoring the education of{" "}
                      <strong className="font-semibold text-primary">{firstLearner.name}</strong>, a
                      Grade {firstLearner.standard} student.
                    </p>
                    {firstLearner.sponsored_until && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Supported until{" "}
                        <strong className="font-semibold text-foreground">
                          {formatSupportedUntil(firstLearner.sponsored_until)}
                        </strong>
                        .
                      </p>
                    )}
                  </>
                )}
                <SponsorshipShareCard
                  learnerName={isMultiple ? `${learners.length} children` : firstLearner.name}
                  learnerStandard={isMultiple ? null : firstLearner.standard}
                  plan={orderStatus.plan}
                  amount={orderStatus.amount}
                />
              </>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {isFailed && (
                <Link
                  href={isMultiple ? "/sponsor/cart" : "/sponsor"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-lift"
                >
                  Try again →
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-semibold text-background transition-all hover:bg-primary hover:text-primary-foreground"
              >
                ← Back Home
              </Link>
            </div>
          </div>

          <aside className="space-y-5 border-t border-border/60 pt-8 text-center text-sm text-muted-foreground lg:border-l lg:border-t-0 lg:pl-8 lg:pt-2 lg:text-left">
            {isSuccess && <p>A dashboard to track your students is on the way.</p>}

            {orderStatus && (
              <p className="text-xs">
                Order ID
                <br />
                <span className="font-mono break-all text-foreground">{orderStatus.order_id}</span>
              </p>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest">Powered by</p>
              <a
                href="https://theboringeducation.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-bold text-foreground transition-colors hover:text-primary"
              >
                The Boring Education ↗
              </a>
              <p className="mt-1 text-xs">Learn tech the boring way.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
