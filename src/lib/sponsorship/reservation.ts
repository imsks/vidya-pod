import type { PrismaClient, SponsorPlanType } from "@/generated/prisma";
import { SponsorOrderStatus } from "@/generated/prisma";
import { syncSponsorOrderFromCashfree } from "@/lib/cashfree/sync-sponsor-order";

const DEFAULT_RESERVATION_MINUTES = 1;

/** How long a PENDING order holds a learner before another sponsor may claim them. */
export const getReservationWindowMs = (): number => {
  const configured = Number(process.env.SPONSORSHIP_RESERVATION_MINUTES);
  const minutes =
    Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RESERVATION_MINUTES;

  return minutes * 60_000;
};

/** Orders created before this instant no longer hold their learner. */
export const getReservationCutoff = (now: Date = new Date()): Date =>
  new Date(now.getTime() - getReservationWindowMs());

export type ReservationInput = {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  plan: SponsorPlanType;
  amount: number;
  learnerId: string;
  publicAcknowledgementOptIn: boolean;
};

export type ReservationResult =
  { reserved: true; id: string } | { reserved: false; reason: "lost_race" };

/**
 * Expires PENDING orders that outlived the reservation window so the learner becomes
 * claimable again. Each order is reconciled against Cashfree first, so a payment that
 * landed just before the cutoff still wins over the expiry.
 */
export const releaseExpiredReservations = async (
  prisma: PrismaClient,
  learnerId: string,
): Promise<number> => {
  const staleOrders = await prisma.sponsorOrder.findMany({
    where: {
      learnerId,
      status: SponsorOrderStatus.PENDING,
      createdAt: { lt: getReservationCutoff() },
    },
    select: { id: true, orderId: true },
  });

  let released = 0;

  for (const order of staleOrders) {
    await syncSponsorOrderFromCashfree(prisma, order.orderId);

    const { count } = await prisma.sponsorOrder.updateMany({
      where: { id: order.id, status: SponsorOrderStatus.PENDING },
      data: { status: SponsorOrderStatus.EXPIRED },
    });

    released += count;
  }

  return released;
};

/**
 * Claims the learner with a PENDING order before the payment gateway is contacted.
 * If a concurrent request got there first, the losing reservation is expired immediately
 * so it never blocks the winner.
 */
export const reserveLearnerForSponsorship = async (
  prisma: PrismaClient,
  input: ReservationInput,
): Promise<ReservationResult> => {
  const reservation = await prisma.sponsorOrder.create({
    data: { ...input, status: SponsorOrderStatus.PENDING },
    select: { id: true, createdAt: true },
  });

  const [winner] = await prisma.sponsorOrder.findMany({
    where: {
      learnerId: input.learnerId,
      status: SponsorOrderStatus.PENDING,
      createdAt: { gte: getReservationCutoff() },
    },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 1,
  });

  if (winner && winner.id !== reservation.id) {
    await prisma.sponsorOrder.update({
      where: { id: reservation.id },
      data: { status: SponsorOrderStatus.EXPIRED },
    });

    return { reserved: false, reason: "lost_race" };
  }

  return { reserved: true, id: reservation.id };
};
