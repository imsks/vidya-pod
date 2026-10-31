import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LEARNER_ID = "550e8400-e29b-41d4-a716-446655440010";
const TEACHER_ID = "550e8400-e29b-41d4-a716-446655440011";

const learnerFindUniqueMock = vi.fn();
const learnerUpdateMock = vi.fn();
const learnerDeleteMock = vi.fn();
const teacherFindUniqueMock = vi.fn();
const teacherUpdateMock = vi.fn();
const teacherDeleteMock = vi.fn();
const proctorFindUniqueMock = vi.fn();
const proctorUpdateMock = vi.fn();
const proctorDeleteMock = vi.fn();
const uploadEntityPhotoMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    learner: {
      findUnique: learnerFindUniqueMock,
      update: learnerUpdateMock,
      delete: learnerDeleteMock,
    },
    teacher: {
      findUnique: teacherFindUniqueMock,
      update: teacherUpdateMock,
      delete: teacherDeleteMock,
    },
    proctor: {
      findUnique: proctorFindUniqueMock,
      update: proctorUpdateMock,
      delete: proctorDeleteMock,
    },
  }),
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, uploadEntityPhoto: uploadEntityPhotoMock };
});

const buildContext = (entity: string, id: string) => ({
  params: Promise.resolve({ entity, id }),
});

const patchRequest = (body: unknown, secret = "test-secret-123") =>
  new Request("http://localhost/api/admin/learner/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify(body),
  });

describe("/api/admin/[entity]/[id]", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
    learnerFindUniqueMock.mockResolvedValue({
      id: LEARNER_ID,
      sponsorId: null,
      sponsorshipEndsAt: null,
    });
    teacherFindUniqueMock.mockResolvedValue({ id: TEACHER_ID });
    proctorFindUniqueMock.mockResolvedValue({ id: TEACHER_ID });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("PATCH", () => {
    it("returns 401 without a valid admin secret", async () => {
      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({ name: "A", standard: "8" }, "nope"),
        buildContext("learner", LEARNER_ID),
      );

      expect(response.status).toBe(401);
      expect(learnerUpdateMock).not.toHaveBeenCalled();
    });

    it("returns 404 for an unsupported entity", async () => {
      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({ name: "A" }),
        buildContext("sponsor", LEARNER_ID),
      );

      expect(response.status).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({ name: "A", standard: "8" }),
        buildContext("learner", "not-a-uuid"),
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when required fields are missing", async () => {
      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({ name: "", standard: "8" }),
        buildContext("learner", LEARNER_ID),
      );

      expect(response.status).toBe(400);
      expect(learnerUpdateMock).not.toHaveBeenCalled();
    });

    it("updates a learner", async () => {
      learnerUpdateMock.mockResolvedValue({
        id: LEARNER_ID,
        name: "Asha Kumar",
        phone: "9999999999",
        standard: "9",
        imageUrl: "https://cdn.test/a.png",
        sponsorId: null,
        sponsorshipEndsAt: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({
          name: "Asha Kumar",
          phone: "9999999999",
          standard: "9",
          image_url: "https://cdn.test/a.png",
        }),
        buildContext("learner", LEARNER_ID),
      );

      expect(response.status).toBe(200);
      expect(learnerUpdateMock).toHaveBeenCalledWith({
        where: { id: LEARNER_ID },
        data: {
          name: "Asha Kumar",
          phone: "9999999999",
          standard: "9",
          imageUrl: "https://cdn.test/a.png",
          sponsorshipEndsAt: null,
        },
      });
      const body = (await response.json()) as { record: { standard: string } };
      expect(body.record.standard).toBe("9");
    });

    it("stores the sponsorship end date as end of day IST", async () => {
      learnerUpdateMock.mockResolvedValue({
        id: LEARNER_ID,
        name: "Asha Kumar",
        phone: null,
        standard: "9",
        imageUrl: null,
        sponsorId: null,
        sponsorshipEndsAt: new Date("2026-11-30T18:29:59.999Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({
          name: "Asha Kumar",
          standard: "9",
          sponsorship_ends_at: "2026-11-30",
        }),
        buildContext("learner", LEARNER_ID),
      );

      expect(response.status).toBe(200);
      expect(learnerUpdateMock).toHaveBeenCalledWith({
        where: { id: LEARNER_ID },
        data: expect.objectContaining({
          sponsorshipEndsAt: new Date("2026-11-30T18:29:59.999Z"),
        }),
      });
      const body = (await response.json()) as { record: { sponsorship_ends_at: string | null } };
      expect(body.record.sponsorship_ends_at).toBe("2026-11-30T18:29:59.999Z");
    });

    it("rejects a malformed sponsorship end date", async () => {
      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({
          name: "Asha Kumar",
          standard: "9",
          sponsorship_ends_at: "30-11-2026",
        }),
        buildContext("learner", LEARNER_ID),
      );

      expect(response.status).toBe(400);
      expect(learnerUpdateMock).not.toHaveBeenCalled();
    });

    it("uploads a new photo when no image url is given", async () => {
      uploadEntityPhotoMock.mockResolvedValue("https://cdn.test/uploaded.png");
      teacherUpdateMock.mockResolvedValue({
        id: TEACHER_ID,
        name: "Ravi",
        phone: "8888888888",
        qualification: "M.Sc",
        imageUrl: "https://cdn.test/uploaded.png",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({
          name: "Ravi",
          phone: "8888888888",
          qualification: "M.Sc",
          image_url: "",
          photo_data: "data:image/png;base64,abc",
          photo_filename: "ravi.png",
        }),
        buildContext("teacher", TEACHER_ID),
      );

      expect(response.status).toBe(200);
      expect(uploadEntityPhotoMock).toHaveBeenCalledWith({
        entityType: "teacher",
        base64Data: "data:image/png;base64,abc",
        filename: "ravi.png",
      });
      expect(teacherUpdateMock).toHaveBeenCalledWith({
        where: { id: TEACHER_ID },
        data: expect.objectContaining({ imageUrl: "https://cdn.test/uploaded.png" }),
      });
    });

    it("returns 404 when the record does not exist", async () => {
      teacherFindUniqueMock.mockResolvedValue(null);

      const { PATCH } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await PATCH(
        patchRequest({ name: "Ravi", phone: "8888888888", qualification: "M.Sc" }),
        buildContext("teacher", TEACHER_ID),
      );

      expect(response.status).toBe(404);
      expect(teacherUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    const deleteRequest = (secret = "test-secret-123") =>
      new Request("http://localhost/api/admin/learner/x", {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });

    it("returns 401 without a valid admin secret", async () => {
      const { DELETE } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await DELETE(deleteRequest("nope"), buildContext("learner", LEARNER_ID));

      expect(response.status).toBe(401);
      expect(learnerDeleteMock).not.toHaveBeenCalled();
    });

    it("refuses to delete a sponsored learner", async () => {
      learnerFindUniqueMock.mockResolvedValue({
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date(Date.now() + 86_400_000),
      });

      const { DELETE } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await DELETE(deleteRequest(), buildContext("learner", LEARNER_ID));

      expect(response.status).toBe(409);
      expect(learnerDeleteMock).not.toHaveBeenCalled();
    });

    it("deletes a learner whose sponsorship has lapsed", async () => {
      learnerFindUniqueMock.mockResolvedValue({
        sponsorId: "sponsor-1",
        sponsorshipEndsAt: new Date(Date.now() - 86_400_000),
      });

      const { DELETE } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await DELETE(deleteRequest(), buildContext("learner", LEARNER_ID));

      expect(response.status).toBe(200);
      expect(learnerDeleteMock).toHaveBeenCalledWith({ where: { id: LEARNER_ID } });
    });

    it("deletes an unsponsored learner", async () => {
      const { DELETE } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await DELETE(deleteRequest(), buildContext("learner", LEARNER_ID));

      expect(response.status).toBe(200);
      expect(learnerDeleteMock).toHaveBeenCalledWith({ where: { id: LEARNER_ID } });
    });

    it("deletes a proctor", async () => {
      const { DELETE } = await import("../../app/api/admin/[entity]/[id]/route");
      const response = await DELETE(deleteRequest(), buildContext("proctor", TEACHER_ID));

      expect(response.status).toBe(200);
      expect(proctorDeleteMock).toHaveBeenCalledWith({ where: { id: TEACHER_ID } });
    });
  });
});
