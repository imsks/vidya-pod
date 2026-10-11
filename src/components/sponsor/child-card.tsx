import Image from "next/image";
import Link from "next/link";
import type { LearnerWithStatus } from "./types";

interface ChildCardProps {
  learner: LearnerWithStatus;
}

const SponsoredCard = ({ learner }: ChildCardProps) => (
  <div className="p-6 rounded-2xl bg-card border border-accent/30 shadow-soft">
    <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-gradient-warm shadow-soft">
      {learner.image_url ? (
        <Image src={learner.image_url} alt={learner.name} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">🧒</div>
      )}
    </div>
    <h3 className="mt-4 text-lg font-bold text-center">{learner.name}</h3>
    <p className="text-sm text-center text-primary font-semibold uppercase tracking-wider mt-1">
      Grade {learner.standard}
    </p>
    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-accent">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
      Sponsored
    </p>
    <p className="mt-2 text-xs text-center text-muted-foreground">
      Their pod is fully funded. Thank you! 🎉
    </p>
  </div>
);

const AvailableCard = ({ learner }: ChildCardProps) => (
  <Link
    href={`/sponsor/${learner.id}`}
    className="group block p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-soft hover:shadow-lift transition-all hover:-translate-y-1"
  >
    <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-gradient-warm shadow-soft">
      {learner.image_url ? (
        <Image src={learner.image_url} alt={learner.name} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">🧒</div>
      )}
    </div>
    <h3 className="mt-4 text-lg font-bold text-center">{learner.name}</h3>
    <p className="text-sm text-center text-primary font-semibold uppercase tracking-wider mt-1">
      Grade {learner.standard}
    </p>
    <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      Ready for sponsorship
    </p>
    <p className="mt-2 text-center text-sm font-semibold text-primary group-hover:underline">
      Sponsor {learner.name.split(" ")[0]} →
    </p>
  </Link>
);

export const ChildCard = ({ learner }: ChildCardProps) =>
  learner.is_sponsored ? <SponsoredCard learner={learner} /> : <AvailableCard learner={learner} />;
