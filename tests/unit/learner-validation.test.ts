import { describe, expect, it } from "vitest";
import { parseLearnerBody } from "@/lib/validation/learner";

describe("parseLearnerBody", () => {
  it("accepts a valid learner payload", () => {
    const result = parseLearnerBody({
      name: "Asha",
      phone: "9999999999",
      standard: "8",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Asha");
      expect(result.data.phone).toBe("9999999999");
      expect(result.data.standard).toBe("8");
    }
  });

  it("accepts a learner payload with sponsor_id", () => {
    const result = parseLearnerBody({
      name: "Ravi",
      phone: "8888888888",
      standard: "10",
      sponsor_id: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sponsor_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    }
  });

  it("accepts a learner payload with optional image_url", () => {
    const result = parseLearnerBody({
      name: "Neha",
      phone: "7777777777",
      standard: "9",
      image_url: "https://example.com/image.jpg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image_url).toBe("https://example.com/image.jpg");
    }
  });

  it("rejects missing name", () => {
    const result = parseLearnerBody({
      phone: "9999999999",
      standard: "8",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects missing phone", () => {
    const result = parseLearnerBody({
      name: "Asha",
      standard: "8",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects missing standard", () => {
    const result = parseLearnerBody({
      name: "Asha",
      phone: "9999999999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects invalid sponsor_id format", () => {
    const result = parseLearnerBody({
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      sponsor_id: "invalid-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
    }
  });

  it("rejects invalid image_url format", () => {
    const result = parseLearnerBody({
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      image_url: "not-a-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
    }
  });

  it("accepts null sponsor_id", () => {
    const result = parseLearnerBody({
      name: "Asha",
      phone: "9999999999",
      standard: "8",
      sponsor_id: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sponsor_id).toBeNull();
    }
  });
});
