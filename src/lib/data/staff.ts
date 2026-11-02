import "server-only";

import type { PrismaClient, Proctor, Teacher } from "@/generated/prisma";

export type CreateStaffInput = {
  name: string;
  phone: string;
  qualification: string;
  imageUrl: string | null;
};

export const createTeacher = (prisma: PrismaClient, input: CreateStaffInput): Promise<Teacher> =>
  prisma.teacher.create({ data: input });

export const createProctor = (prisma: PrismaClient, input: CreateStaffInput): Promise<Proctor> =>
  prisma.proctor.create({ data: input });
