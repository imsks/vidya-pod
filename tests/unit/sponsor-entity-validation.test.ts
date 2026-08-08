import { describe, expect, it } from "vitest";
import { parseSponsorEntityBody } from "@/lib/validation/sponsor-entity";

describe("parseSponsorEntityBody", () => {
  it("accepts a valid sponsor entity payload", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "john@example.com",
      phone: "9999999999",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.phone).toBe("9999999999");
    }
  });

  it("accepts a sponsor with organization", () => {
    const result = parseSponsorEntityBody({
      name: "Jane Smith",
      email: "jane@company.com",
      phone: "8888888888",
      organization: "ACME Corp",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organization).toBe("ACME Corp");
    }
  });

  it("accepts a sponsor with optional image_url", () => {
    const result = parseSponsorEntityBody({
      name: "Bob Wilson",
      email: "bob@example.com",
      phone: "7777777777",
      image_url: "https://example.com/avatar.jpg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image_url).toBe("https://example.com/avatar.jpg");
    }
  });

  it("rejects missing name", () => {
    const result = parseSponsorEntityBody({
      email: "test@example.com",
      phone: "9999999999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects missing email", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      phone: "9999999999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects invalid email format", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "not-an-email",
      phone: "9999999999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/email/i);
    }
  });

  it("rejects missing phone", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "john@example.com",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/required/i);
    }
  });

  it("rejects invalid image_url format", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "john@example.com",
      phone: "9999999999",
      image_url: "not-a-url",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(400);
    }
  });

  it("accepts null organization", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "john@example.com",
      phone: "9999999999",
      organization: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organization).toBeNull();
    }
  });

  it("accepts empty string for organization", () => {
    const result = parseSponsorEntityBody({
      name: "John Doe",
      email: "john@example.com",
      phone: "9999999999",
      organization: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organization).toBe("");
    }
  });
});
