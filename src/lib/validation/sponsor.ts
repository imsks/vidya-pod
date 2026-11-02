import { z } from "zod";
import { MAX_LEARNERS_PER_CHECKOUT, type PlanType } from "@/constants/pricing";

export const sponsorPlans = ["monthly", "yearly"] as const satisfies readonly PlanType[];

export const sponsorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  plan: z.enum(sponsorPlans),
  learner_ids: z
    .array(z.string().uuid("Valid learner ID is required"))
    .min(1, "Select at least one child")
    .max(
      MAX_LEARNERS_PER_CHECKOUT,
      `You can sponsor up to ${MAX_LEARNERS_PER_CHECKOUT} children at once`,
    )
    .refine((ids) => new Set(ids).size === ids.length, "Each child can only be selected once"),
  public_acknowledgement_opt_in: z.boolean().default(false),
});

export type SponsorInput = z.infer<typeof sponsorSchema>;

export type SponsorParseResult =
  { success: true; data: SponsorInput } | { success: false; error: string; status: 400 };

export const parseSponsorBody = (body: unknown): SponsorParseResult => {
  const result = sponsorSchema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid sponsor payload";
    return { success: false, error: message, status: 400 };
  }

  return { success: true, data: result.data };
};

export const createSponsorOrderId = (now = Date.now(), random = Math.random): string => {
  return `VP_${now}_${random().toString(36).slice(2, 8)}`;
};
