import type { Metadata } from "next";
import { Suspense } from "react";
import { SponsorSelectPage } from "@/components/sponsor/sponsor-select-page";

export const metadata: Metadata = {
  title: "Sponsor a Pod - Vidya Pods",
  description:
    "Fund a learning pod. Monthly or Yearly. Every rupee goes to teachers, books, and kids.",
};

export default function Page() {
  return (
    <Suspense>
      <SponsorSelectPage />
    </Suspense>
  );
}
