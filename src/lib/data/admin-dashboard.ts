import "server-only";

import type { PrismaClient } from "@/generated/prisma";

export const getAdminDashboardRecords = async (prisma: PrismaClient) => {
  const [teachers, learners, proctors, sponsors, sponsorOrders, expenses] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.learner.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.proctor.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.sponsor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { learners: true, orders: true } },
      },
    }),
    prisma.sponsorOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        learner: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.expense.findMany({
      orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return { teachers, learners, proctors, sponsors, sponsorOrders, expenses };
};
