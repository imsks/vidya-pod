import Image from "next/image";
import Link from "next/link";
import type { ReadyToSponsorLearner } from "./types";

interface LearnerCardProps {
  learner: ReadyToSponsorLearner;
}

export const LearnerCard = ({ learner }: LearnerCardProps) => (
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
    <p className="text-xs text-center text-muted-foreground mt-2">Waiting for a sponsor 💛</p>
    <p className="mt-4 text-center text-sm font-semibold text-primary group-hover:underline">
      Sponsor {learner.name.split(" ")[0]} →
    </p>
  </Link>
);
