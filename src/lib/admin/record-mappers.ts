import type { Learner, Proctor, Sponsor, SponsorOrder, Teacher } from "@/generated/prisma";

export const mapTeacher = (teacher: Teacher) => ({
  id: teacher.id,
  name: teacher.name,
  phone: teacher.phone,
  qualification: teacher.qualification,
  image_url: teacher.imageUrl,
  created_at: teacher.createdAt.toISOString(),
});

export const mapLearner = (learner: Learner) => ({
  id: learner.id,
  name: learner.name,
  phone: learner.phone,
  standard: learner.standard,
  image_url: learner.imageUrl,
  sponsor_id: learner.sponsorId,
  created_at: learner.createdAt.toISOString(),
});

export const mapProctor = (proctor: Proctor) => ({
  id: proctor.id,
  name: proctor.name,
  phone: proctor.phone,
  qualification: proctor.qualification,
  image_url: proctor.imageUrl,
  created_at: proctor.createdAt.toISOString(),
});

export type SponsorWithCounts = Sponsor & {
  _count: { learners: number; orders: number };
};

export const mapSponsor = (sponsor: SponsorWithCounts) => ({
  id: sponsor.id,
  name: sponsor.name,
  email: sponsor.email,
  phone: sponsor.phone,
  organization: sponsor.organization,
  image_url: sponsor.imageUrl,
  learner_count: sponsor._count.learners,
  order_count: sponsor._count.orders,
  created_at: sponsor.createdAt.toISOString(),
});

export type SponsorOrderWithLearner = SponsorOrder & {
  learner: { id: string; name: string } | null;
};

export const mapSponsorOrder = (order: SponsorOrderWithLearner) => ({
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
