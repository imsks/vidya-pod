import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import {
  mapLearner,
  mapProctor,
  mapSponsor,
  mapSponsorOrder,
  mapTeacher,
} from "@/lib/admin/record-mappers";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const adminSecret = getAdminSecretFromRequest(request);
    if (!validateAdminSecret(adminSecret)) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 });
    }

    const prisma = getPrisma();
    const [teachers, learners, proctors, sponsors, sponsorOrders] = await Promise.all([
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
    ]);

    return NextResponse.json({
      teachers: teachers.map(mapTeacher),
      learners: learners.map(mapLearner),
      proctors: proctors.map(mapProctor),
      sponsors: sponsors.map(mapSponsor),
      sponsor_orders: sponsorOrders.map(mapSponsorOrder),
    });
  } catch (error) {
    console.error("Error in admin route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
