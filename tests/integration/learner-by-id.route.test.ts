import { beforeEach, describe, expect, it, vi } from "vitest";

const LEARNER_ID = "550e8400-e29b-41d4-a716-446655440010";

const learnerFindUniqueMock = vi.fn();
const sponsorOrderFindFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: {
      findUnique: learnerFindUniqueMock,
    },
    sponsorOrder: {
      findFirst: sponsorOrderFindFirstMock,
    },
  }),
}));

describe("GET /api/learner/[learnerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    learnerFindUniqueMock.mockResolvedValue({
      id: LEARNER_ID,
      name: "Asha Kumar",
      standard: "8",
      imageUrl: "https://example.com/photo.jpg",
      sponsorId: null,
    });
    sponsorOrderFindFirstMock.mockResolvedValue(null);
  });

  it("returns learner details when available", async () => {
    const { GET } = await import("../../app/api/learner/[learnerId]/route");
    const response = await GET(new Request("http://localhost/api/learner/test"), {
      params: Promise.resolve({ learnerId: LEARNER_ID }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      id: LEARNER_ID,
      name: "Asha Kumar",
      standard: "8",
      image_url: "https://example.com/photo.jpg",
    });
  });

  it("returns 404 when learner is not found", async () => {
    learnerFindUniqueMock.mockResolvedValue(null);

    const { GET } = await import("../../app/api/learner/[learnerId]/route");
    const response = await GET(new Request("http://localhost/api/learner/test"), {
      params: Promise.resolve({ learnerId: LEARNER_ID }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 when learner is already sponsored", async () => {
    learnerFindUniqueMock.mockResolvedValue({
      id: LEARNER_ID,
      name: "Asha Kumar",
      standard: "8",
      imageUrl: null,
      sponsorId: "550e8400-e29b-41d4-a716-446655440099",
    });

    const { GET } = await import("../../app/api/learner/[learnerId]/route");
    const response = await GET(new Request("http://localhost/api/learner/test"), {
      params: Promise.resolve({ learnerId: LEARNER_ID }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 409 when learner has a pending order", async () => {
    sponsorOrderFindFirstMock.mockResolvedValue({ id: "pending-order" });

    const { GET } = await import("../../app/api/learner/[learnerId]/route");
    const response = await GET(new Request("http://localhost/api/learner/test"), {
      params: Promise.resolve({ learnerId: LEARNER_ID }),
    });

    expect(response.status).toBe(409);
  });
});
