"use client";

import { useState } from "react";
import { buildShareCaption, getAppDomain } from "@/lib/sponsorship/share-url";

type SponsorshipShareCardProps = {
  learnerName?: string | null;
  learnerStandard?: string | null;
  plan: string;
  amount: number;
};

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
    {children}
  </span>
);

export const SponsorshipShareCard = ({
  learnerName,
  learnerStandard,
  plan,
  amount,
}: SponsorshipShareCardProps) => {
  const [copied, setCopied] = useState(false);

  const isYearly = plan === "yearly";
  const caption = buildShareCaption(learnerName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mt-8 text-left">
      <div className="rounded-[26px] bg-gradient-hero p-[2px] shadow-glow">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-dusk px-5 py-7 text-white sm:px-7 sm:py-9">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/45 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-14 h-52 w-52 rounded-full bg-accent/40 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.22),transparent_55%)]"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <span className="inline-block h-7 w-7 rounded-xl bg-gradient-hero" />
                Vidya Pods
              </div>
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                Sponsor
              </span>
            </div>

            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">
              I&apos;m sponsoring
            </p>
            <p className="mt-2 font-display text-3xl font-black leading-[1.1] break-words sm:text-4xl">
              {learnerName || "a child"} <span aria-hidden>✨</span>
            </p>
            <p className="mt-2 text-sm text-white/80">
              {learnerStandard ? `Grade ${learnerStandard} student. ` : ""}Teacher, books and
              supplies covered - so they stay in tuition.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>
                {isYearly ? "Yearly" : "Monthly"} · ₹{amount.toLocaleString("en-IN")}
                {isYearly ? "/yr" : "/mo"}
              </Pill>
              <Pill>100% goes to their classroom</Pill>
            </div>

            <div className="mt-7 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-white/20 pt-5">
              <p className="font-display text-base font-bold sm:text-lg">
                Sponsor a child&apos;s education.
              </p>
              <p className="text-sm font-semibold text-white/75">{getAppDomain()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
        <p className="text-sm text-muted-foreground">📸 Screenshot it, then share.</p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-semibold transition-all hover:border-primary hover:text-primary"
        >
          {copied ? "Caption copied!" : "Copy caption"}
        </button>
      </div>
    </section>
  );
};
