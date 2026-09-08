import Link from "next/link";

export const SponsorHeader = () => (
  <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
        <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
        Vidya Pods
      </Link>
    </div>
  </header>
);
