import "server-only";

import type { Learner, PrismaClient, Proctor, Teacher } from "@/generated/prisma";
import { isLearnerSponsored } from "@/lib/sponsorship/availability";

export type UpdateLearnerInput = {
  name: string;
  phone: string | null;
  standard: string;
  imageUrl: string | null;
  sponsorshipEndsAt: Date | null;
};

export type UpdateStaffInput = {
  name: string;
  phone: string;
  qualification: string;
  imageUrl: string | null;
};

export const updateLearnerRecord = async (
  prisma: PrismaClient,
  id: string,
  data: UpdateLearnerInput,
): Promise<Learner | null> => {
  const existing = await prisma.learner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return prisma.learner.update({ where: { id }, data });
};

export const updateTeacherRecord = async (
  prisma: PrismaClient,
  id: string,
  data: UpdateStaffInput,
): Promise<Teacher | null> => {
  const existing = await prisma.teacher.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return prisma.teacher.update({ where: { id }, data });
};

export const updateProctorRecord = async (
  prisma: PrismaClient,
  id: string,
  data: UpdateStaffInput,
): Promise<Proctor | null> => {
  const existing = await prisma.proctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return prisma.proctor.update({ where: { id }, data });
};

export type DeleteLearnerResult = "deleted" | "not_found" | "sponsored";

export const deleteLearnerRecord = async (
  prisma: PrismaClient,
  id: string,
): Promise<DeleteLearnerResult> => {
  const learner = await prisma.learner.findUnique({
    where: { id },
    select: { sponsorId: true, sponsorshipEndsAt: true },
  });

  if (!learner) return "not_found";
  // Removing an actively sponsored learner would orphan a paid sponsorship.
  if (isLearnerSponsored(learner)) return "sponsored";

  await prisma.learner.delete({ where: { id } });
  return "deleted";
};

export const deleteTeacherRecord = async (prisma: PrismaClient, id: string): Promise<boolean> => {
  const teacher = await prisma.teacher.findUnique({ where: { id }, select: { id: true } });
  if (!teacher) return false;
  await prisma.teacher.delete({ where: { id } });
  return true;
};

export const deleteProctorRecord = async (prisma: PrismaClient, id: string): Promise<boolean> => {
  const proctor = await prisma.proctor.findUnique({ where: { id }, select: { id: true } });
  if (!proctor) return false;
  await prisma.proctor.delete({ where: { id } });
  return true;
};
