import type { Metadata } from "next";
import { Suspense } from "react";
import { SponsorThankYouPage } from "@/components/sponsor/sponsor-thank-you-page";

export const metadata: Metadata = {
  title: "Thank You — Vidya Pods",
  description: "Your sponsorship payment is being processed.",
};

export default function Page() {
  return (
    <Suspense>
      <SponsorThankYouPage />
    </Suspense>
  );
}
