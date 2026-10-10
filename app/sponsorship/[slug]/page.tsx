import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SponsorHeader } from "@/components/sponsor/sponsor-header";
import { getPrisma } from "@/lib/prisma";
import { getPublicSponsorship } from "@/lib/sponsorship/get-public-sponsorship";
import { buildShareMessage, buildSponsorshipShareUrl } from "@/lib/sponsorship/share-url";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sponsorship = await getPublicSponsorship(getPrisma(), slug);

  if (!sponsorship) {
    return {
      title: "Sponsorship not found — Vidya Pods",
    };
  }

  const title = sponsorship.learner
    ? `${sponsorship.sponsorName} is sponsoring ${sponsorship.learner.name} — Vidya Pods`
    : `${sponsorship.sponsorName} is funding a pod — Vidya Pods`;
  const description = buildShareMessage(sponsorship.learner?.name);
  const url = buildSponsorshipShareUrl(slug) ?? undefined;

  return {
    title,
    description,
    openGraph: { title, description, url, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const sponsorship = await getPublicSponsorship(getPrisma(), slug);

  if (!sponsorship) {
    notFound();
  }

  const sponsoredOn = sponsorship.sponsoredAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <SponsorHeader />

      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-4xl">
          🎉
        </div>

        <h1 className="mt-6 text-3xl font-black font-display">
          {sponsorship.sponsorName} funded a Vidya Pod
        </h1>

        {sponsorship.learner ? (
          <p className="mt-4 text-lg">
            <strong className="text-primary">{sponsorship.learner.name}</strong> (Grade{" "}
            {sponsorship.learner.standard}) is now sponsored and on their way to learning with Vidya
            Pods.
          </p>
        ) : (
          <p className="mt-4 text-lg">
            A learner is now sponsored and on their way to learning with Vidya Pods.
          </p>
        )}

        <p className="mt-3 text-sm text-muted-foreground">
          {sponsorship.plan === "yearly" ? "Yearly" : "Monthly"} sponsorship · {sponsoredOn}
        </p>

        <Link
          href="/sponsor"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-glow hover:shadow-lift transition-all"
        >
          Sponsor a learner too →
        </Link>
      </main>
    </div>
  );
}
