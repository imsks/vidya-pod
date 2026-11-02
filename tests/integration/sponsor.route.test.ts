import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRICING } from "@/constants/pricing";

const ASHA = "550e8400-e29b-41d4-a716-446655440010";
const RAVI = "550e8400-e29b-41d4-a716-446655440011";
const MONTHLY_AMOUNT = PRICING.monthly.total;
const YEARLY_AMOUNT = PRICING.yearly.total;

const sponsorOrderCreateMock = vi.fn();
const sponsorOrderUpdateMock = vi.fn();
const sponsorOrderUpdateManyMock = vi.fn();
const sponsorOrderFindManyMock = vi.fn();
const learnerFindUniqueMock = vi.fn();
const sponsorOrderFindFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    sponsorOrder: {
      create: sponsorOrderCreateMock,
      update: sponsorOrderUpdateMock,
      updateMany: sponsorOrderUpdateManyMock,
      findMany: sponsorOrderFindManyMock,
      findFirst: sponsorOrderFindFirstMock,
    },
    learner: {
      findUnique: learnerFindUniqueMock,
    },
  }),
}));

const validPayload = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly" as const,
  learner_ids: [ASHA],
  public_acknowledgement_opt_in: true,
};

const learnerRow = (id: string, sponsorId: string | null = null, endsAt: Date | null = null) => ({
  id,
  name: `Learner ${id}`,
  standard: "8",
  imageUrl: null,
  sponsorId,
  sponsorshipEndsAt: endsAt,
});

const post = async (body: unknown) => {
  const { POST } = await import("../../app/api/sponsor/route");
  return POST(
    new Request("http://localhost/api/sponsor", { method: "POST", body: JSON.stringify(body) }),
  );
};

const cashfreeOk = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ payment_session_id: "session_123" }),
  });

describe("POST /api/sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    let reservation = 0;
    sponsorOrderCreateMock.mockImplementation(async () => ({
      id: `reservation-${++reservation}`,
      createdAt: new Date(),
    }));
    sponsorOrderUpdateMock.mockResolvedValue({});
    sponsorOrderUpdateManyMock.mockResolvedValue({ count: 0 });
    // Stale reservations are empty; the winner check returns whichever reservation was just made.
    sponsorOrderFindManyMock.mockImplementation(async ({ take }: { take?: number }) =>
      take ? [{ id: `reservation-${reservation}` }] : [],
    );
    learnerFindUniqueMock.mockImplementation(async ({ where }: { where: { id: string } }) =>
      learnerRow(where.id),
    );
    sponsorOrderFindFirstMock.mockResolvedValue(null);
    process.env.CASHFREE_BASE_URL = "https://sandbox.cashfree.com";
    process.env.CASHFREE_CLIENT_ID = "client";
    process.env.CASHFREE_SECRET_KEY = "secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("returns 400 when learner_ids is missing", async () => {
    const response = await post({ ...validPayload, learner_ids: undefined });

    expect(response.status).toBe(400);
  });

  it("returns 409 when a learner is not found", async () => {
    learnerFindUniqueMock.mockResolvedValue(null);

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Learner not found",
      unavailable: [{ learner_id: ASHA, message: "Learner not found" }],
    });
  });

  it("returns 409 when learner is already sponsored", async () => {
    learnerFindUniqueMock.mockResolvedValue(
      learnerRow(ASHA, "550e8400-e29b-41d4-a716-446655440099", new Date(Date.now() + 86_400_000)),
    );

    const response = await post(validPayload);

    expect(response.status).toBe(409);
  });

  it("returns 409 when learner has an active reservation", async () => {
    sponsorOrderFindFirstMock.mockResolvedValue({ id: "pending-order" });

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect(sponsorOrderCreateMock).not.toHaveBeenCalled();
  });

  it("reserves the learner before calling cashfree and attaches the payment session", async () => {
    const fetchMock = cashfreeOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(validPayload);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      orderId: expect.stringMatching(/^VP_/),
      paymentSessionId: "session_123",
      amount: MONTHLY_AMOUNT,
    });
    expect(sponsorOrderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: `${json.orderId}-1`,
        paymentOrderId: json.orderId,
        name: "Donor",
        plan: "monthly",
        amount: MONTHLY_AMOUNT,
        status: "PENDING",
        learnerId: ASHA,
        publicAcknowledgementOptIn: true,
      }),
      select: { id: true, createdAt: true },
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      order_id: json.orderId,
      order_amount: MONTHLY_AMOUNT,
    });
    expect(sponsorOrderUpdateManyMock).toHaveBeenCalledWith({
      where: { paymentOrderId: json.orderId },
      data: { paymentSessionId: "session_123" },
    });
  });

  it("creates one row per learner and charges the server-computed total once", async () => {
    const fetchMock = cashfreeOk();
    vi.stubGlobal("fetch", fetchMock);

    const response = await post({ ...validPayload, plan: "yearly", learner_ids: [ASHA, RAVI] });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.amount).toBe(YEARLY_AMOUNT * 2);
    expect(sponsorOrderCreateMock.mock.calls.map(([args]) => args.data)).toEqual([
      expect.objectContaining({
        orderId: `${json.orderId}-1`,
        paymentOrderId: json.orderId,
        learnerId: ASHA,
        amount: YEARLY_AMOUNT,
      }),
      expect.objectContaining({
        orderId: `${json.orderId}-2`,
        paymentOrderId: json.orderId,
        learnerId: RAVI,
        amount: YEARLY_AMOUNT,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      order_id: json.orderId,
      order_amount: YEARLY_AMOUNT * 2,
    });
  });

  it("lists every unavailable learner and reserves nobody", async () => {
    learnerFindUniqueMock.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === RAVI
        ? learnerRow(RAVI, "550e8400-e29b-41d4-a716-446655440099", null)
        : learnerRow(where.id),
    );

    const response = await post({ ...validPayload, learner_ids: [ASHA, RAVI] });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Some children are no longer available. Remove them to continue.",
      unavailable: [{ learner_id: RAVI, message: "This learner is already sponsored" }],
    });
    expect(sponsorOrderCreateMock).not.toHaveBeenCalled();
  });

  it("releases every hold when a concurrent request already claimed a learner", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sponsorOrderFindManyMock.mockImplementation(async ({ take }: { take?: number }) =>
      take ? [{ id: "someone-else" }] : [],
    );

    const response = await post(validPayload);

    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sponsorOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: "reservation-1" },
      data: { status: "EXPIRED" },
    });
    expect(sponsorOrderUpdateManyMock).toHaveBeenCalledWith({
      where: { paymentOrderId: expect.stringMatching(/^VP_/), status: "PENDING" },
      data: { status: "FAILED" },
    });
  });

  it("returns 502 and frees every hold when cashfree fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "bad request" }),
      }),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await post({ ...validPayload, learner_ids: [ASHA, RAVI] });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Payment gateway error",
    });
    expect(sponsorOrderUpdateManyMock).toHaveBeenCalledWith({
      where: { paymentOrderId: expect.stringMatching(/^VP_/), status: "PENDING" },
      data: { status: "FAILED" },
    });
    consoleError.mockRestore();
  });
});
