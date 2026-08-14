import { describe, expect, it } from "vitest";
import { createSponsorOrderId, parseSponsorBody } from "@/lib/validation/sponsor";

const LEARNER_ID = "550e8400-e29b-41d4-a716-446655440010";

describe("parseSponsorBody", () => {
  it("accepts a valid monthly sponsor payload", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "monthly",
      amount: 400,
      learner_id: LEARNER_ID,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "not-an-email",
      phone: "9999999999",
      plan: "monthly",
      amount: 400,
      learner_id: LEARNER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/email/i);
    }
  });

  it("rejects missing learner_id", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "monthly",
      amount: 400,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid learner_id", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "monthly",
      amount: 400,
      learner_id: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  it("rejects amount that does not match plan pricing", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "yearly",
      amount: 100,
      learner_id: LEARNER_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/4800/);
    }
  });

  it("rejects unknown plans", () => {
    const result = parseSponsorBody({
      name: "Donor",
      email: "donor@example.com",
      phone: "9999999999",
      plan: "lifetime",
      amount: 400,
      learner_id: LEARNER_ID,
    });

    expect(result.success).toBe(false);
  });
});

describe("createSponsorOrderId", () => {
  it("creates a deterministic order id from inputs", () => {
    expect(createSponsorOrderId(1_700_000_000_000, () => 0.123456)).toMatch(
      /^VP_1700000000000_[a-z0-9]+$/,
    );
  });
});

describe("createSponsorOrderId", () => {
  it("creates a deterministic order id from inputs", () => {
    expect(createSponsorOrderId(1_700_000_000_000, () => 0.123456)).toMatch(
      /^VP_1700000000000_[a-z0-9]+$/,
    );
  });
});
