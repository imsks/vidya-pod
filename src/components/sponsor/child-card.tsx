import Image from "next/image";
import Link from "next/link";
import type { LearnerWithStatus } from "./types";

/** Add/remove control shown when the donor can collect several children into one payment. */
export interface CartToggle {
  inCart: boolean;
  pending: boolean;
  /** Why the toggle is blocked right now (cart full or locked by a payment); null when usable. */
  disabledReason: string | null;
  onToggle: () => void;
}

interface ChildCardProps {
  learner: LearnerWithStatus;
  cartToggle?: CartToggle;
}

const formatEndDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

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
    {learner.sponsorship_ends_at && (
      <p className="mt-1 text-xs text-center text-muted-foreground">
        Sponsored till {formatEndDate(learner.sponsorship_ends_at)}
      </p>
    )}
  </div>
);

const CartToggleButton = ({
  learner,
  toggle,
}: {
  learner: LearnerWithStatus;
  toggle: CartToggle;
}) => {
  const blocked = Boolean(toggle.disabledReason);

  return (
    <>
      <button
        type="button"
        onClick={toggle.onToggle}
        disabled={toggle.pending || blocked}
        title={blocked ? (toggle.disabledReason ?? undefined) : undefined}
        className={`relative z-10 mt-4 w-full rounded-full border px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          toggle.inCart
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-border bg-background hover:border-primary hover:text-primary"
        }`}
      >
        {toggle.pending ? (
          "Updating…"
        ) : toggle.inCart ? (
          <>
            <span aria-hidden>✓ </span>In cart
            <span className="sr-only"> — remove {learner.name}</span>
          </>
        ) : (
          <>
            <span aria-hidden>+ </span>Add<span className="sr-only"> {learner.name}</span> to cart
          </>
        )}
      </button>
      {blocked && (
        <p className="relative z-10 mt-2 text-xs text-center text-muted-foreground">
          {toggle.disabledReason}
        </p>
      )}
    </>
  );
};

const AvailableCard = ({ learner, cartToggle }: ChildCardProps) => (
  <div
    className={`group relative p-6 rounded-2xl bg-card border shadow-soft hover:shadow-lift transition-all hover:-translate-y-1 ${
      cartToggle?.inCart
        ? "border-primary ring-2 ring-primary/30"
        : "border-border hover:border-primary/40"
    }`}
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
    {/* The link stretches over the whole card; only the cart button sits above it. */}
    <Link
      href={`/sponsor/${learner.id}`}
      className="mt-2 block text-center text-sm font-semibold text-primary group-hover:underline after:absolute after:inset-0 after:rounded-2xl"
    >
      Sponsor {learner.name.split(" ")[0]} →
    </Link>
    {cartToggle && <CartToggleButton learner={learner} toggle={cartToggle} />}
  </div>
);

export const ChildCard = ({ learner, cartToggle }: ChildCardProps) =>
  learner.is_sponsored ? (
    <SponsoredCard learner={learner} />
  ) : (
    <AvailableCard learner={learner} cartToggle={cartToggle} />
  );
