"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlanType } from "@/constants/pricing";
import { PricingPanel } from "./pricing-panel";
import { SponsorHeader } from "./sponsor-header";
import { SponsorPaymentForm } from "./sponsor-payment-form";
import type { LearnerDetailResponse } from "./types";

interface SponsorCheckoutPageProps {
  learnerId: string;
}

export const SponsorCheckoutPage = ({ learnerId }: SponsorCheckoutPageProps) => {
  const [plan, setPlan] = useState<PlanType>("monthly");
  const [learner, setLearner] = useState<LearnerDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLearner() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/learner/${learnerId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load learner");
        }

        const data: LearnerDetailResponse = await res.json();
        setLearner(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load learner");
      } finally {
        setLoading(false);
      }
    }

    fetchLearner();
  }, [learnerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SponsorHeader />
        <main className="max-w-4xl mx-auto px-6 py-16">
          <Link
            href="/sponsor"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Choose a different child
          </Link>
          <div className="mt-8 animate-pulse space-y-4 text-center">
            <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !learner) {
    return (
      <div className="min-h-screen bg-background">
        <SponsorHeader />
        <main className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold">Unable to continue</h1>
          <p className="mt-3 text-muted-foreground">
            {error || "This learner is no longer available for sponsorship."}
          </p>
          <Link
            href="/sponsor"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
          >
            ← Choose another child
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link
          href="/sponsor"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Choose a different child
        </Link>

        <div className="mt-8 text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Sponsor a Pod
          </div>
          <h1 className="mt-3 text-4xl md:text-5xl font-black font-display">
            Fund a pod. <span className="text-gradient">Fuel a generation.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every rupee goes directly to teachers, books, stationery, and kids.
          </p>
        </div>

        <div className="mt-10 p-6 rounded-3xl bg-card border border-primary/20 shadow-soft flex items-center gap-5">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-warm shrink-0">
            {learner.image_url ? (
              <Image src={learner.image_url} alt={learner.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🧒</div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">You&apos;re sponsoring</p>
            <p className="text-xl font-bold">{learner.name}</p>
            <p className="text-sm text-primary font-semibold">Grade {learner.standard}</p>
          </div>
        </div>

        <div className="mt-10">
          <PricingPanel plan={plan} onPlanChange={setPlan} />
        </div>

        <div className="mt-8">
          <SponsorPaymentForm learnerId={learnerId} plan={plan} />
        </div>
      </main>
    </div>
  );
};
