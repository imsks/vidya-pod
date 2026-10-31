"use client";

import type { PlanType } from "@/constants/pricing";
import { DonorPaymentForm } from "./donor-payment-form";
import { getPricingTotal } from "./pricing-panel";
import type { DonorDetails } from "./use-sponsorship-cart";

interface SponsorPaymentFormProps {
  learnerId: string;
  learnerName?: string;
  plan: PlanType;
}

export const SponsorPaymentForm = ({ learnerId, learnerName, plan }: SponsorPaymentFormProps) => {
  const total = getPricingTotal(plan);

  const startPayment = async (donor: DonorDetails) => {
    const res = await fetch("/api/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...donor,
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
    return result.paymentSessionId as string;
  };

  return (
    <DonorPaymentForm
      amount={total}
      onSubmit={startPayment}
      description={
        <>
          We use these details to link your sponsorship to{" "}
          <strong className="font-semibold text-foreground">{learnerName ?? "this child"}</strong>{" "}
          and to send you receipts and progress updates. We never share them publicly.
        </>
      }
    />
  );
};
