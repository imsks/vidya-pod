import { NextResponse } from "next/server";
import type { Learner, Proctor, SponsorOrder, Teacher } from "@/generated/prisma";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

const mapTeacher = (teacher: Teacher) => ({
  id: teacher.id,
  name: teacher.name,
  phone: teacher.phone,
  qualification: teacher.qualification,
  image_url: teacher.imageUrl,
  created_at: teacher.createdAt.toISOString(),
});

const mapLearner = (learner: Learner) => ({
  id: learner.id,
  name: learner.name,
  phone: learner.phone,
  standard: learner.standard,
  image_url: learner.imageUrl,
  sponsor_id: learner.sponsorId,
  created_at: learner.createdAt.toISOString(),
});

const mapProctor = (proctor: Proctor) => ({
  id: proctor.id,
  name: proctor.name,
  phone: proctor.phone,
  qualification: proctor.qualification,
  image_url: proctor.imageUrl,
  created_at: proctor.createdAt.toISOString(),
});

type SponsorOrderWithLearner = SponsorOrder & {
  learner: { id: string; name: string } | null;
};

const mapSponsorOrder = (order: SponsorOrderWithLearner) => ({
  id: order.id,
  order_id: order.orderId,
  name: order.name,
  email: order.email,
  phone: order.phone,
  plan: order.plan,
  amount: order.amount,
  status: order.status,
  payment_session_id: order.paymentSessionId,
  learner_id: order.learnerId,
  learner_name: order.learner?.name ?? null,
  created_at: order.createdAt.toISOString(),
});

export async function GET(request: Request) {
  try {
    const adminSecret = getAdminSecretFromRequest(request);
    if (!validateAdminSecret(adminSecret)) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 });
    }

    const prisma = getPrisma();
    const [teachers, learners, proctors, sponsors] = await Promise.all([
      prisma.teacher.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.learner.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.proctor.findMany({ orderBy: { createdAt: "desc" } }),
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
      sponsors: sponsors.map(mapSponsorOrder),
    });
  } catch (error) {
    console.error("Error in admin route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
