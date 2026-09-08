import type { Metadata } from "next";
import { Suspense } from "react";
import { SponsorCheckoutPage } from "@/components/sponsor/sponsor-checkout-page";

export const metadata: Metadata = {
  title: "Fund a Pod — Vidya Pods",
  description: "Fund a learning pod and fuel a generation.",
};

type PageProps = {
  params: Promise<{ learnerId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { learnerId } = await params;

  return (
    <Suspense>
      <SponsorCheckoutPage learnerId={learnerId} />
    </Suspense>
  );
}
