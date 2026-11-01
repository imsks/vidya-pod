"use client";

import { useState } from "react";
import type { PlanType } from "@/constants/pricing";
import { getPricingTotal } from "./pricing-panel";
import type { UnavailableLearner } from "./types";
import { useCashfreeSDK } from "./use-cashfree-sdk";

interface SponsorPaymentFormProps {
  learnerIds: string[];
  learnerName?: string;
  plan: PlanType;
  disabled?: boolean;
  onUnavailable?: (unavailable: UnavailableLearner[]) => void;
}

export const SponsorPaymentForm = ({
  learnerIds,
  learnerName,
  plan,
  disabled = false,
  onUnavailable,
}: SponsorPaymentFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [publicAcknowledgementOptIn, setPublicAcknowledgementOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loaded: cashfreeLoaded, launchPayment } = useCashfreeSDK();

  // Display only; the server prices the checkout itself.
  const total = getPricingTotal(plan) * learnerIds.length;

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
          learner_ids: learnerIds,
          public_acknowledgement_opt_in: publicAcknowledgementOptIn,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.unavailable) {
          onUnavailable?.(data.unavailable);
        }
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
      <div>
        <h2 className="text-xl font-bold">Your Details</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We use these details to link your sponsorship to{" "}
          <strong className="font-semibold text-foreground">{learnerName ?? "this child"}</strong>{" "}
          and to send you receipts and progress updates. Your contact details and donation amount
          are never shown publicly.
        </p>
      </div>

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

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={publicAcknowledgementOptIn}
          onChange={(event) => setPublicAcknowledgementOptIn(event.target.checked)}
          className="mt-1 accent-primary"
        />
        <span>
          You may include my name in the public supporter thank-you list. This is optional; my
          contact details and donation amount will remain private.
        </span>
      </label>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !cashfreeLoaded || disabled}
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
