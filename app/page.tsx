import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";

export const metadata: Metadata = {
  title: "Vidya Pods — Free Home Tuitions for Every Child",
  description:
    "A pod-based education system bringing free home tuitions to school-going kids. Teachers paid, Proctors empowered, Sponsors changing lives.",
  openGraph: {
    title: "Vidya Pods — Sponsor a Learning Pod",
    description: "Kids learn free. Teachers get paid. Sponsors fuel hope. Join the movement.",
  },
};

export default function Page() {
  return <HomePage />;
}
