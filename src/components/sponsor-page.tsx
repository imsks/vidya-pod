"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PRICING, type PlanType } from "@/constants/pricing";

interface ReadyToSponsorLearner {
  id: string;
  name: string;
  standard: string;
  image_url: string | null;
  created_at: string;
}

interface LearnersResponse {
  success: boolean;
  data: ReadyToSponsorLearner[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

type CashfreeMode = "sandbox" | "production";

interface CashfreeCheckout {
  checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => void;
}

interface CashfreeFactory {
  (opts: { mode: CashfreeMode }): CashfreeCheckout;
}

const getCashfreeFactory = (): CashfreeFactory | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Cashfree?: CashfreeFactory }).Cashfree;
};

function useCashfreeSDK() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = document.getElementById("cashfree-sdk");
    if (existing) {
      const timer = window.setTimeout(() => setLoaded(true), 0);
      return () => window.clearTimeout(timer);
    }

    const script = document.createElement("script");
    script.id = "cashfree-sdk";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  const launchPayment = useCallback(
    (paymentSessionId: string) => {
      const Cashfree = getCashfreeFactory();
      if (!loaded || !Cashfree) return;
      const mode: CashfreeMode =
        process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";
      const cashfree = Cashfree({ mode });
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
  const { loaded: cashfreeLoaded, launchPayment } = useCashfreeSDK();

  // State for ready-to-sponsor learners
  const [learners, setLearners] = useState<ReadyToSponsorLearner[]>([]);
  const [learnersLoading, setLearnersLoading] = useState(true);
  const [learnersError, setLearnersError] = useState("");

  // Fetch learners ready to sponsor
  useEffect(() => {
    async function fetchLearners() {
      try {
        setLearnersLoading(true);
        setLearnersError("");
        const res = await fetch("/api/learner/ready-to-sponsor?limit=12");
        if (!res.ok) {
          throw new Error("Failed to fetch learners");
        }
        const data: LearnersResponse = await res.json();
        setLearners(data.data);
      } catch (err) {
        setLearnersError(err instanceof Error ? err.message : "Failed to load learners");
      } finally {
        setLearnersLoading(false);
      }
    }
    fetchLearners();
  }, []);

  const pricing = PRICING[plan];

  if (orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-4xl">
            🎉
          </div>
          <h1 className="mt-6 text-3xl font-black font-display">Thank You!</h1>
          <p className="mt-3 text-muted-foreground">
            Your sponsorship is being processed. Order ID:{" "}
            <strong className="text-foreground">{orderId}</strong>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ll receive a confirmation once the payment is verified.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            ← Back Home
          </Link>
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
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
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
            Fund a pod. <span className="text-gradient">Fuel a generation.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every rupee goes directly to teachers, books, stationery, and kids. Choose your plan
            below.
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
                {p === "yearly" && <span className="ml-2 text-xs text-accent">Save ₹6,000</span>}
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
                  <span className="font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
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
              <label className="block text-sm font-medium mb-2">Full Name</label>
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
              <label className="block text-sm font-medium mb-2">Phone Number</label>
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
              {loading ? "Processing..." : `Pay ₹${pricing.total.toLocaleString("en-IN")} →`}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment via Cashfree. 100% goes to the pod.
            </p>
          </form>
        </div>

        {/* Ready to Sponsor Learners Section */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Meet the Kids
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-black">
              Learners <span className="text-gradient">Ready for Sponsorship</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              These children are waiting for a sponsor like you. Your support will help them access
              quality education and transform their lives.
            </p>
          </div>

          {learnersLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
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
          ) : learnersError ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-3xl mb-4">
                ⚠️
              </div>
              <p className="text-muted-foreground">{learnersError}</p>
            </div>
          ) : learners.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-3xl mb-4">
                🎉
              </div>
              <p className="text-lg font-semibold">All Learners Are Sponsored!</p>
              <p className="text-muted-foreground mt-2">
                Thank you to all our generous sponsors. Check back soon for new learners.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {learners.map((learner) => (
                <div
                  key={learner.id}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-soft hover:shadow-lift transition-all hover:-translate-y-1"
                >
                  <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-gradient-warm shadow-soft">
                    {learner.image_url ? (
                      <Image
                        src={learner.image_url}
                        alt={learner.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🧒
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-center">{learner.name}</h3>
                  <p className="text-sm text-center text-primary font-semibold uppercase tracking-wider mt-1">
                    Grade {learner.standard}
                  </p>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Waiting for a sponsor 💛
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
