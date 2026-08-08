import { z } from "zod";

/**
 * Zod validation schemas for Learner entity
 */
export const learnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  standard: z.string().trim().min(1, "Standard is required"),
  image_url: z.string().url().optional().or(z.literal("")).optional(),
  sponsor_id: z.string().uuid().optional().nullable(),
});

export type LearnerInput = z.infer<typeof learnerSchema>;

export type LearnerParseResult =
  { success: true; data: LearnerInput } | { success: false; error: string; status: 400 };

export const parseLearnerBody = (body: unknown): LearnerParseResult => {
  const result = learnerSchema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid learner payload";
    return { success: false, error: message, status: 400 };
  }

  return { success: true, data: result.data };
};
