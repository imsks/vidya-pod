import { z } from "zod";

export const registerRoles = ["teacher", "proctor"] as const;

export type RegisterRole = (typeof registerRoles)[number];

const baseRegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  image_url: z.string().url().optional().or(z.literal("")).optional(),
});

export const registerSchema = z.discriminatedUnion("role", [
  baseRegisterSchema.extend({
    role: z.literal("teacher"),
    qualification: z.string().trim().min(1, "Qualification is required"),
  }),
  baseRegisterSchema.extend({
    role: z.literal("proctor"),
    qualification: z.string().trim().min(1, "Qualification is required"),
  }),
]);

export type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterParseResult =
  { success: true; data: RegisterInput } | { success: false; error: string; status: 400 };

export const parseRegisterBody = (body: unknown): RegisterParseResult => {
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid registration payload";
    return { success: false, error: message, status: 400 };
  }

  return { success: true, data: result.data };
};

export const getRegisterTable = (role: RegisterRole): "teachers" | "proctors" => {
  if (role === "teacher") return "teachers";
  return "proctors";
};
