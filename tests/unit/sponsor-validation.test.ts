import { describe, expect, it } from "vitest";
import { MAX_LEARNERS_PER_CHECKOUT } from "@/constants/pricing";
import { createSponsorOrderId, parseSponsorBody } from "@/lib/validation/sponsor";

const learnerId = (n: number) => `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`;

const validPayload = {
  name: "Donor",
  email: "donor@example.com",
  phone: "9999999999",
  plan: "monthly",
  learner_ids: [learnerId(1)],
};

describe("parseSponsorBody", () => {
  it("accepts a valid monthly sponsor payload", () => {
    const result = parseSponsorBody(validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.public_acknowledgement_opt_in).toBe(false);
    }
  });

  it("preserves an explicit public acknowledgement opt-in", () => {
    const result = parseSponsorBody({ ...validPayload, public_acknowledgement_opt_in: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.public_acknowledgement_opt_in).toBe(true);
    }
  });

  it("accepts several learners", () => {
    const result = parseSponsorBody({ ...validPayload, learner_ids: [learnerId(1), learnerId(2)] });

    expect(result.success).toBe(true);
  });

  it("ignores a client-supplied amount", () => {
    const result = parseSponsorBody({ ...validPayload, amount: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("amount");
    }
  });

  it("rejects invalid email", () => {
    const result = parseSponsorBody({ ...validPayload, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/email/i);
    }
  });

  it("rejects missing or empty learner_ids", () => {
    expect(parseSponsorBody({ ...validPayload, learner_ids: undefined }).success).toBe(false);
    expect(parseSponsorBody({ ...validPayload, learner_ids: [] })).toMatchObject({
      success: false,
      error: "Select at least one child",
    });
  });

  it("rejects invalid learner ids", () => {
    expect(parseSponsorBody({ ...validPayload, learner_ids: ["not-a-uuid"] })).toMatchObject({
      success: false,
      error: "Valid learner ID is required",
    });
  });

  it("rejects duplicate learners", () => {
    expect(
      parseSponsorBody({ ...validPayload, learner_ids: [learnerId(1), learnerId(1)] }),
    ).toMatchObject({ success: false, error: "Each child can only be selected once" });
  });

  it("rejects more learners than one checkout allows", () => {
    const ids = Array.from({ length: MAX_LEARNERS_PER_CHECKOUT + 1 }, (_, i) => learnerId(i + 1));

    expect(parseSponsorBody({ ...validPayload, learner_ids: ids }).success).toBe(false);
  });

  it("rejects unknown plans", () => {
    expect(parseSponsorBody({ ...validPayload, plan: "lifetime" }).success).toBe(false);
  });
});

describe("createSponsorOrderId", () => {
  it("creates a deterministic order id from inputs", () => {
    expect(createSponsorOrderId(1_700_000_000_000, () => 0.123456)).toMatch(
      /^VP_1700000000000_[a-z0-9]+$/,
    );
  });
});
