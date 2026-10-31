"use client";

import { useId, useState, type ReactNode } from "react";
import { formatRupees } from "./cart-format";
import { useCashfreeSDK } from "./use-cashfree-sdk";
import type { DonorDetails } from "./use-sponsorship-cart";

interface DonorPaymentFormProps {
  amount: number;
  /** Explains what the donor's details are used for. */
  description: ReactNode;
  /** Starts the payment and resolves with the Cashfree session to open. */
  onSubmit: (donor: DonorDetails) => Promise<string>;
  /** Blocks paying, e.g. while the cart has unavailable children. */
  disabled?: boolean;
  disabledReason?: string | null;
}

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition";

export const DonorPaymentForm = ({
  amount,
  description,
  onSubmit,
  disabled = false,
  disabledReason,
}: DonorPaymentFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loaded: cashfreeLoaded, launchPayment } = useCashfreeSDK();
  const fieldId = useId();

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const paymentSessionId = await onSubmit({ name, email, phone });
      launchPayment(paymentSessionId);
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
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      <div>
        <label htmlFor={`${fieldId}-name`} className="block text-sm font-medium mb-2">
          Full Name
        </label>
        <input
          id={`${fieldId}-name`}
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-email`} className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          id={`${fieldId}-email`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-phone`} className="block text-sm font-medium mb-2">
          Phone Number
        </label>
        <input
          id={`${fieldId}-phone`}
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit phone number"
          pattern="[0-9]{10}"
          className={inputClassName}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      {disabled && disabledReason && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {disabledReason}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !cashfreeLoaded || disabled}
        className="w-full rounded-xl bg-gradient-hero text-primary-foreground px-6 py-4 font-bold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : `Pay ${formatRupees(amount)} →`}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Cashfree. 100% goes to the pod.
      </p>
    </form>
  );
};
