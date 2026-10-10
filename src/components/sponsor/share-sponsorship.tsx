"use client";

import { useState } from "react";
import { buildShareMessage, buildSocialShareLinks } from "@/lib/sponsorship/share-url";

type ShareSponsorshipProps = {
  shareUrl: string;
  learnerName?: string | null;
};

export const ShareSponsorship = ({ shareUrl, learnerName }: ShareSponsorshipProps) => {
  const [copied, setCopied] = useState(false);
  const message = buildShareMessage(learnerName);
  const links = buildSocialShareLinks(shareUrl, message);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 px-5 py-4 text-left">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Share your sponsorship
      </p>

      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          aria-label="Public sponsorship URL"
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="flex-1 min-w-0 rounded-full border border-border/60 bg-background px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["X (Twitter)", links.twitter],
            ["WhatsApp", links.whatsapp],
            ["Facebook", links.facebook],
            ["LinkedIn", links.linkedin],
          ] as const
        ).map(([label, href]) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border/60 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary transition-all"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
};
