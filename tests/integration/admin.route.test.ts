import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const orderMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}));

describe("GET /api/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderMock.mockResolvedValue({ data: [] });
    selectMock.mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });
  });

  it("returns empty collections when no rows exist", async () => {
    const { GET } = await import("../../app/api/admin/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      teachers: [],
      students: [],
      proctors: [],
      sponsors: [],
    });
    expect(fromMock).toHaveBeenCalledWith("teachers");
    expect(fromMock).toHaveBeenCalledWith("students");
    expect(fromMock).toHaveBeenCalledWith("proctors");
    expect(fromMock).toHaveBeenCalledWith("sponsor_orders");
  });
});
