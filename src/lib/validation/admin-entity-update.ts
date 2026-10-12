import { z } from "zod";

export const adminEditableEntities = ["learner", "teacher", "proctor"] as const;

export type AdminEditableEntity = (typeof adminEditableEntities)[number];

export const isAdminEditableEntity = (value: string): value is AdminEditableEntity =>
  (adminEditableEntities as readonly string[]).includes(value);

const imageUrlField = z
  .string()
  .trim()
  .url("Profile photo URL must be a valid URL")
  .or(z.literal(""))
  .optional()
  .nullable();

const learnerUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().nullable(),
  standard: z.string().trim().min(1, "Standard is required"),
  image_url: imageUrlField,
});

const staffUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  qualification: z.string().trim().min(1, "Qualification is required"),
  image_url: imageUrlField,
});

export type LearnerUpdateInput = z.infer<typeof learnerUpdateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export type AdminEntityUpdateParseResult =
  | { success: true; entity: "learner"; data: LearnerUpdateInput }
  | { success: true; entity: "teacher" | "proctor"; data: StaffUpdateInput }
  | { success: false; error: string; status: 400 };

export const parseAdminEntityUpdateBody = (
  entity: AdminEditableEntity,
  body: unknown,
): AdminEntityUpdateParseResult => {
  if (entity === "learner") {
    const result = learnerUpdateSchema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message ?? "Invalid learner payload",
        status: 400,
      };
    }

    return { success: true, entity, data: result.data };
  }

  const result = staffUpdateSchema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? `Invalid ${entity} payload`,
      status: 400,
    };
  }

  return { success: true, entity, data: result.data };
};
