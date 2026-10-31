import type { Metadata } from "next";
import { TransparencyPage } from "@/components/transparency/transparency-page";

export const metadata: Metadata = {
  title: "Impact & Spending - Vidya Pods",
  description: "See how much Vidya Pods has received and how recorded funds are being spent.",
};

export default function Page() {
  return <TransparencyPage />;
}
