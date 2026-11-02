import type { Metadata } from "next";
import { SponsorCartPage } from "@/components/sponsor/sponsor-cart-page";

export const metadata: Metadata = {
  title: "Your List - Vidya Pods",
  description: "Sponsor several children's learning pods with one payment.",
};

export default function Page() {
  return <SponsorCartPage />;
}
