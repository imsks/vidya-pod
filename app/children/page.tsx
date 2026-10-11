import type { Metadata } from "next";
import { Suspense } from "react";
import { ChildrenPage } from "@/components/sponsor/children-page";

export const metadata: Metadata = {
  title: "Our Children - Vidya Pods",
  description:
    "Meet every child in a Vidya Pod. See who is already sponsored and who is still waiting for a sponsor.",
};

export default function Page() {
  return (
    <Suspense>
      <ChildrenPage />
    </Suspense>
  );
}
