import { beforeEach, describe, expect, it, vi } from "vitest";

const connectDB = vi.fn();
const Teacher = { find: vi.fn() };
const Student = { find: vi.fn() };
const Proctor = { find: vi.fn() };
const SponsorOrder = { find: vi.fn() };

vi.mock("@/lib/mongodb", () => ({
  connectDB,
}));

vi.mock("@/lib/models", () => ({
  Teacher,
  Student,
  Proctor,
  SponsorOrder,
}));

const createQuery = <T>(rows: T[]) => ({
  sort: vi.fn().mockReturnValue({
    lean: vi.fn().mockResolvedValue(rows),
  }),
});

describe("GET /api/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectDB.mockResolvedValue(undefined);
  });

  it("returns serialized collections sorted by created_at", async () => {
    Teacher.find.mockReturnValue(
      createQuery([
        {
          _id: "507f1f77bcf86cd799439011",
          name: "Meera",
          phone: "9876543210",
          qualification: "M.Sc",
          created_at: new Date("2026-01-01"),
        },
      ]),
    );
    Student.find.mockReturnValue(createQuery([]));
    Proctor.find.mockReturnValue(createQuery([]));
    SponsorOrder.find.mockReturnValue(createQuery([]));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(connectDB).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(body.teachers).toEqual([
      {
        id: "507f1f77bcf86cd799439011",
        name: "Meera",
        phone: "9876543210",
        qualification: "M.Sc",
        created_at: new Date("2026-01-01").toISOString(),
      },
    ]);
    expect(body.students).toEqual([]);
    expect(body.proctors).toEqual([]);
    expect(body.sponsors).toEqual([]);
  });
});
