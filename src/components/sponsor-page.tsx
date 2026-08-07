"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PRICING, type PlanType } from "@/constants/pricing";

type VerifyStatus = "loading" | "SUCCESS" | "FAILED" | "PENDING" | "ERROR";

const VERIFY_CONTENT: Record<
  VerifyStatus,
  { emoji: string; title: string; message: string }
> = {
  loading: {
    emoji: "⏳",
    title: "Verifying Payment",
    message:
      "Hang on while we confirm your sponsorship with the payment gateway.",
  },
  SUCCESS: {
    emoji: "🎉",
    title: "Thank You!",
    message: "Your sponsorship is confirmed. You'll receive a receipt shortly.",
  },
  FAILED: {
    emoji: "⚠️",
    title: "Payment Failed",
    message: "We couldn't confirm your payment. No amount has been charged.",
  },
  PENDING: {
    emoji: "⏳",
    title: "Payment Processing",
    message:
      "Your payment is still being processed. This page updates once it clears.",
  },
  ERROR: {
    emoji: "⏳",
    title: "Payment Processing",
    message:
      "We couldn't reach the payment gateway just now. Your order is safe.",
  },
};

function useCashfreeSDK() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById("cashfree-sdk")) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "cashfree-sdk";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  const launchPayment = useCallback(
    (paymentSessionId: string) => {
      if (!loaded || !(window as any).Cashfree) return;
      const mode = process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";
      const cashfree = (window as any).Cashfree({ mode });
      cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
    },
    [loaded],
  );

  return { loaded, launchPayment };
}

export function SponsorPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [plan, setPlan] = useState<PlanType>("monthly");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("loading");
  const { loaded: cashfreeLoaded, launchPayment } = useCashfreeSDK();

  // Cashfree redirects back here with ?order_id=..., but the redirect itself
  // is not proof of payment — only the server can confirm it.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    fetch(`/api/sponsor/verify?order_id=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (!cancelled) setVerifyStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) setVerifyStatus("ERROR");
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const pricing = PRICING[plan];

  if (orderId) {
    const content = VERIFY_CONTENT[verifyStatus];

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl ${
              verifyStatus === "FAILED" ? "bg-destructive/20" : "bg-accent/20"
            }`}
          >
            {content.emoji}
          </div>
          <h1 className="mt-6 text-3xl font-black font-display">
            {content.title}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Order ID: <strong className="text-foreground">{orderId}</strong>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{content.message}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {verifyStatus === "FAILED" && (
              <Link
                href="/sponsor"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90 transition-all"
              >
                Try Again
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
            >
              ← Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, plan, amount: pricing.total }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Payment failed");
      }

      const result = await res.json();
      launchPayment(result.paymentSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-xl"
          >
            <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
            Vidya Pods
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Sponsor a Pod
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
            Fund a pod.{" "}
            <span className="text-gradient">Fuel a generation.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every rupee goes directly to teachers, books, stationery, and kids.
            Choose your plan below.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full bg-muted p-1">
            {(["monthly", "yearly"] as PlanType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all capitalize ${
                  plan === p
                    ? "bg-foreground text-background shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
                {p === "yearly" && (
                  <span className="ml-2 text-xs text-accent">
                    Save ₹6,000
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-card border border-border shadow-soft">
            <h2 className="text-xl font-bold">
              {plan === "monthly" ? "Monthly" : "Yearly"} Breakdown
            </h2>
            <div className="mt-6 space-y-4">
              {pricing.breakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-border/50"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-2xl font-display text-primary">
                  ₹{pricing.total.toLocaleString("en-IN")}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan === "monthly" ? "mo" : "yr"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <form
            onSubmit={handlePay}
            className="p-8 rounded-3xl bg-card border border-border shadow-soft space-y-5"
          >
            <h2 className="text-xl font-bold">Your Details</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit phone number"
                pattern="[0-9]{10}"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !cashfreeLoaded}
              className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-4 font-bold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? "Processing..."
                : `Pay ₹${pricing.total.toLocaleString("en-IN")} →`}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Cashfree. 100% goes to the pod.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
