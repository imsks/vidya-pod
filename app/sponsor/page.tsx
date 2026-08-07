import type { Metadata } from "next";
import { Suspense } from "react";
import { SponsorPage } from "@/components/sponsor-page";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Sponsor a Pod — Vidya Pods",
  description:
    "Fund a learning pod. Monthly or Yearly. Every rupee goes to teachers, books, and kids.",
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense>
      <SponsorPage user={user} />
    </Suspense>
  );
}

