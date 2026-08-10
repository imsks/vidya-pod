import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const learnerFindManyMock = vi.fn();
const learnerCountMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: {
      findMany: learnerFindManyMock,
      count: learnerCountMock,
    },
  }),
}));

describe("GET /api/learner/ready-to-sponsor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default mock data for learners ready to sponsor
    learnerFindManyMock.mockResolvedValue([
      {
        id: "uuid-1",
        name: "Learner One",
        standard: "8",
        imageUrl: "https://example.com/photo1.jpg",
        createdAt: new Date("2024-01-15T00:00:00Z"),
      },
      {
        id: "uuid-2",
        name: "Learner Two",
        standard: "9",
        imageUrl: null,
        createdAt: new Date("2024-01-10T00:00:00Z"),
      },
    ]);
    learnerCountMock.mockResolvedValue(2);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns learners ready to sponsor with default pagination", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toEqual({
      id: "uuid-1",
      name: "Learner One",
      standard: "8",
      image_url: "https://example.com/photo1.jpg",
      created_at: "2024-01-15T00:00:00.000Z",
    });
    expect(data.data[1].image_url).toBeNull();

    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total_count: 2,
      total_pages: 1,
      has_next_page: false,
      has_previous_page: false,
    });

    expect(learnerFindManyMock).toHaveBeenCalledWith({
      where: { sponsorId: null },
      select: {
        id: true,
        name: true,
        standard: true,
        imageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });

    expect(learnerCountMock).toHaveBeenCalledWith({
      where: { sponsorId: null },
    });
  });

  it("applies custom pagination parameters", async () => {
    learnerCountMock.mockResolvedValue(25);
    learnerFindManyMock.mockResolvedValue([
      {
        id: "uuid-3",
        name: "Learner Three",
        standard: "10",
        imageUrl: null,
        createdAt: new Date("2024-01-05T00:00:00Z"),
      },
    ]);

    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor?page=2&limit=5");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor?page=2&limit=5"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.pagination).toEqual({
      page: 2,
      limit: 5,
      total_count: 25,
      total_pages: 5,
      has_next_page: true,
      has_previous_page: true,
    });

    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      }),
    );
  });

  it("caps limit at maximum value", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor?limit=500");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor?limit=500"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.pagination.limit).toBe(100);
    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }),
    );
  });

  it("handles invalid page parameter gracefully", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor?page=-5");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor?page=-5"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.pagination.page).toBe(1);
    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
      }),
    );
  });

  it("handles non-numeric page parameter gracefully", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor?page=abc");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor?page=abc"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  it("handles non-numeric limit parameter gracefully", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor?limit=invalid");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor?limit=invalid"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  it("returns empty data when no learners are ready to sponsor", async () => {
    learnerFindManyMock.mockResolvedValue([]);
    learnerCountMock.mockResolvedValue(0);

    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.pagination.total_count).toBe(0);
    expect(data.pagination.total_pages).toBe(0);
  });

  it("returns 500 when database query fails", async () => {
    learnerFindManyMock.mockRejectedValue(new Error("Database connection failed"));

    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor"),
    });

    const response = await GET(request as never);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Database connection failed");
  });

  it("excludes learners with sponsors from results", async () => {
    const { GET } = await import("../../app/api/learner/ready-to-sponsor/route");
    const request = new Request("http://localhost/api/learner/ready-to-sponsor");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("http://localhost/api/learner/ready-to-sponsor"),
    });

    await GET(request as never);

    expect(learnerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sponsorId: null },
      }),
    );
  });
});
