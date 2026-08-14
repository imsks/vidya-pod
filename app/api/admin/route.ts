import { NextResponse } from "next/server";
import type { Proctor, SponsorOrder, Student, Teacher } from "@/generated/prisma";
import { getPrisma } from "@/lib/prisma";

const mapTeacher = (teacher: Teacher) => ({
  id: teacher.id,
  name: teacher.name,
  phone: teacher.phone,
  qualification: teacher.qualification,
  image_url: teacher.imageUrl,
  created_at: teacher.createdAt.toISOString(),
});

const mapStudent = (student: Student) => ({
  id: student.id,
  name: student.name,
  phone: student.phone,
  standard: student.standard,
  image_url: student.imageUrl,
  created_at: student.createdAt.toISOString(),
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

export async function GET() {
  try {
    const prisma = getPrisma();
    const [teachers, students, proctors, sponsors] = await Promise.all([
      prisma.teacher.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.student.findMany({ orderBy: { createdAt: "desc" } }),
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
      students: students.map(mapStudent),
      proctors: proctors.map(mapProctor),
      sponsors: sponsors.map(mapSponsorOrder),
    });
  } catch (error) {
    console.error("Error in admin route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
