"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SponsorHeader } from "./sponsor-header";
import type { SponsorOrderStatusResponse } from "./types";

const POLL_INTERVAL_MS = 3000;

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

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl ${
            isFailed ? "bg-destructive/20" : "bg-accent/20"
          }`}
        >
          {isFailed ? "😔" : isSuccess ? "🎉" : "⏳"}
        </div>

        <h1 className="mt-6 text-3xl font-black font-display">
          {isFailed ? "Payment Failed" : isSuccess ? "Thank You!" : "Processing Payment"}
        </h1>

        {loading && !orderStatus && (
          <p className="mt-3 text-muted-foreground">Checking your payment status...</p>
        )}

        {error && <p className="mt-3 text-destructive">{error}</p>}

        {orderStatus && (
          <>
            <p className="mt-3 text-muted-foreground">
              Order ID: <strong className="text-foreground">{orderStatus.order_id}</strong>
            </p>

            {isPending && (
              <p className="mt-2 text-sm text-muted-foreground">
                Your payment is being verified. This page will update automatically.
              </p>
            )}

            {isSuccess && orderStatus.learner && (
              <p className="mt-4 text-lg">
                You are now sponsoring{" "}
                <strong className="text-primary">{orderStatus.learner.name}</strong> (Grade{" "}
                {orderStatus.learner.standard}).
              </p>
            )}

            {isFailed && (
              <p className="mt-4 text-muted-foreground">
                Your payment could not be completed. Please try again.
              </p>
            )}
          </>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {isFailed && (
            <Link
              href="/sponsor"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-glow hover:shadow-lift transition-all"
            >
              Try again →
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            ← Back Home
          </Link>
        </div>
      </main>
    </div>
  );
};
