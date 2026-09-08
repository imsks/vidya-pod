import type { Metadata } from "next";
import { Suspense } from "react";
import { SponsorSelectPage } from "@/components/sponsor/sponsor-select-page";

export const metadata: Metadata = {
  title: "Sponsor a Pod — Vidya Pods",
  description: "Choose a child to sponsor and fund their learning pod.",
};

export default function Page() {
  return (
    <Suspense>
      <SponsorSelectPage />
    </Suspense>
  );
}
