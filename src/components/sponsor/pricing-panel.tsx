import { PRICING, type PlanType } from "@/constants/pricing";

interface PricingPanelProps {
  plan: PlanType;
  onPlanChange: (plan: PlanType) => void;
}

export const PricingPanel = ({ plan, onPlanChange }: PricingPanelProps) => {
  const pricing = PRICING[plan];

  return (
    <>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-muted p-1">
          {(["monthly", "yearly"] as PlanType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPlanChange(p)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all capitalize ${
                plan === p
                  ? "bg-foreground text-background shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
              {p === "yearly" && <span className="ml-2 text-xs text-accent">Save ₹6,000</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 p-8 rounded-3xl bg-card border border-border shadow-soft">
        <h2 className="text-xl font-bold">{plan === "monthly" ? "Monthly" : "Yearly"} Breakdown</h2>
        <div className="mt-6 space-y-4">
          {pricing.breakdown.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2 border-b border-border/50"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-lg">Total</span>
            <span className="font-black text-2xl font-display text-primary">
              ₹{pricing.total.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-muted-foreground">
                /{plan === "monthly" ? "mo" : "yr"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export const getPricingTotal = (plan: PlanType) => PRICING[plan].total;
