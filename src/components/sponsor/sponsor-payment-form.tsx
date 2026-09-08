"use client";

import { useState } from "react";
import type { PlanType } from "@/constants/pricing";
import { getPricingTotal } from "./pricing-panel";
import { useCashfreeSDK } from "./use-cashfree-sdk";

interface SponsorPaymentFormProps {
  learnerId: string;
  plan: PlanType;
}

export const SponsorPaymentForm = ({ learnerId, plan }: SponsorPaymentFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loaded: cashfreeLoaded, launchPayment } = useCashfreeSDK();

  const total = getPricingTotal(plan);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          plan,
          amount: total,
          learner_id: learnerId,
        }),
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
        <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !cashfreeLoaded}
        className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-4 font-bold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : `Pay ₹${total.toLocaleString("en-IN")} →`}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Cashfree. 100% goes to the pod.
      </p>
    </form>
  );
};
