import { z } from "zod";

/**
 * Zod validation schemas for Sponsor entity (individual/organization)
 */
export const sponsorEntitySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  organization: z.string().trim().optional().nullable(),
  image_url: z.string().url().optional().or(z.literal("")).optional(),
});

export type SponsorEntityInput = z.infer<typeof sponsorEntitySchema>;

export type SponsorEntityParseResult =
  { success: true; data: SponsorEntityInput } | { success: false; error: string; status: 400 };

export const parseSponsorEntityBody = (body: unknown): SponsorEntityParseResult => {
  const result = sponsorEntitySchema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid sponsor payload";
    return { success: false, error: message, status: 400 };
  }

  return { success: true, data: result.data };
};
