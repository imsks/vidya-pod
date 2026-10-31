import Image from "next/image";
import Link from "next/link";
import { MONTHLY_TOTAL } from "@/constants/pricing";
import type { LearnerWithStatus } from "./types";

interface ChildCardProps {
  learner: LearnerWithStatus;
}

const formatEndDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

// h-full keeps every card in a row the same height regardless of its footer.
const CARD_BASE =
  "flex h-full flex-col items-center rounded-2xl border bg-card p-5 text-center shadow-soft";

const Avatar = ({ learner, ringClass }: ChildCardProps & { ringClass: string }) => (
  <div
    className={`relative h-24 w-24 overflow-hidden rounded-full bg-gradient-warm ring-4 ${ringClass}`}
  >
    {learner.image_url ? (
      <Image
        src={learner.image_url}
        alt={learner.name}
        fill
        sizes="96px"
        className="object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-4xl">🧒</div>
    )}
  </div>
);

const Identity = ({ learner }: ChildCardProps) => (
  <>
    <h3 className="mt-4 text-lg leading-tight font-bold">{learner.name}</h3>
    <span className="mt-2 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      Grade {learner.standard}
    </span>
  </>
);

const SponsoredCard = ({ learner }: ChildCardProps) => (
  <div className={`${CARD_BASE} border-accent/30`}>
    <Avatar learner={learner} ringClass="ring-accent/20" />
    <Identity learner={learner} />
    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-accent">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      Sponsored
    </p>
    <div className="mt-auto w-full pt-4">
      <p className="rounded-xl bg-accent/10 px-3 py-2.5 text-xs text-muted-foreground">
        {learner.sponsorship_ends_at
          ? `Funded till ${formatEndDate(learner.sponsorship_ends_at)}`
          : "Their pod is fully funded 🎉"}
      </p>
    </div>
  </div>
);

const AvailableCard = ({ learner }: ChildCardProps) => (
  <Link
    href={`/sponsor/${learner.id}`}
    className={`${CARD_BASE} group border-border transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift`}
  >
    <Avatar learner={learner} ringClass="ring-primary/10" />
    <Identity learner={learner} />
    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      Ready for sponsorship
    </p>
    <div className="mt-auto w-full pt-4">
      <p className="text-xs text-muted-foreground">
        from <span className="font-bold text-foreground">₹{MONTHLY_TOTAL}</span>/month
      </p>
      <span className="mt-2 block rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        Sponsor {learner.name.split(" ")[0]}
      </span>
    </div>
  </Link>
);

export const ChildCard = ({ learner }: ChildCardProps) =>
  learner.is_sponsored ? <SponsoredCard learner={learner} /> : <AvailableCard learner={learner} />;
