import { describe, expect, it } from "vitest";
import {
  availableLearnerWhere,
  isLearnerSponsored,
  sponsoredLearnerWhere,
} from "@/lib/sponsorship/availability";
import {
  addMonths,
  fromIstDateInput,
  sponsorshipEndFor,
  toIstDateInput,
} from "@/lib/sponsorship/period";

const NOW = new Date("2026-11-05T10:00:00.000Z");

describe("isLearnerSponsored", () => {
  it("treats an unsponsored learner as available", () => {
    expect(isLearnerSponsored({ sponsorId: null, sponsorshipEndsAt: null }, NOW)).toBe(false);
  });

  it("treats a sponsored learner with no end date as permanently sponsored", () => {
    expect(isLearnerSponsored({ sponsorId: "s-1", sponsorshipEndsAt: null }, NOW)).toBe(true);
  });

  it("treats a future end date as sponsored", () => {
    const endsAt = new Date("2026-12-05T10:00:00.000Z");
    expect(isLearnerSponsored({ sponsorId: "s-1", sponsorshipEndsAt: endsAt }, NOW)).toBe(true);
  });

  it("treats a past end date as lapsed", () => {
    const endsAt = new Date("2026-10-31T18:29:59.999Z");
    expect(isLearnerSponsored({ sponsorId: "s-1", sponsorshipEndsAt: endsAt }, NOW)).toBe(false);
  });

  it("keeps a sponsorship active on its final instant", () => {
    expect(isLearnerSponsored({ sponsorId: "s-1", sponsorshipEndsAt: NOW }, NOW)).toBe(true);
  });

  it("ignores an end date when there is no sponsor", () => {
    const endsAt = new Date("2027-01-01T00:00:00.000Z");
    expect(isLearnerSponsored({ sponsorId: null, sponsorshipEndsAt: endsAt }, NOW)).toBe(false);
  });
});

describe("learner where clauses", () => {
  it("builds the available predicate", () => {
    expect(availableLearnerWhere(NOW)).toEqual({
      OR: [{ sponsorId: null }, { sponsorshipEndsAt: { lt: NOW } }],
    });
  });

  it("builds the sponsored predicate", () => {
    expect(sponsoredLearnerWhere(NOW)).toEqual({
      sponsorId: { not: null },
      OR: [{ sponsorshipEndsAt: null }, { sponsorshipEndsAt: { gte: NOW } }],
    });
  });

  it("partitions every learner state into exactly one bucket", () => {
    const states = [
      { sponsorId: null, sponsorshipEndsAt: null },
      { sponsorId: null, sponsorshipEndsAt: new Date("2027-01-01T00:00:00.000Z") },
      { sponsorId: "s-1", sponsorshipEndsAt: null },
      { sponsorId: "s-1", sponsorshipEndsAt: new Date("2026-12-05T10:00:00.000Z") },
      { sponsorId: "s-1", sponsorshipEndsAt: new Date("2026-10-31T18:29:59.999Z") },
    ];

    for (const state of states) {
      const sponsored = isLearnerSponsored(state, NOW);
      const matchesAvailable = state.sponsorId === null || (state.sponsorshipEndsAt ?? NOW) < NOW;
      expect(sponsored).toBe(!matchesAvailable);
    }
  });
});

describe("addMonths", () => {
  it("adds a whole month", () => {
    expect(addMonths(new Date("2026-11-05T10:00:00.000Z"), 1)).toEqual(
      new Date("2026-12-05T10:00:00.000Z"),
    );
  });

  it("rolls over the year boundary", () => {
    expect(addMonths(new Date("2026-12-15T10:00:00.000Z"), 1)).toEqual(
      new Date("2027-01-15T10:00:00.000Z"),
    );
  });

  it("clamps to the last day of a shorter month", () => {
    expect(addMonths(new Date("2027-01-31T10:00:00.000Z"), 1)).toEqual(
      new Date("2027-02-28T10:00:00.000Z"),
    );
  });

  it("clamps to a leap day", () => {
    expect(addMonths(new Date("2028-01-31T10:00:00.000Z"), 1)).toEqual(
      new Date("2028-02-29T10:00:00.000Z"),
    );
  });
});

describe("sponsorshipEndFor", () => {
  it("gives monthly plans one month", () => {
    expect(sponsorshipEndFor("monthly", NOW)).toEqual(new Date("2026-12-05T10:00:00.000Z"));
  });

  it("gives yearly plans twelve months", () => {
    expect(sponsorshipEndFor("yearly", NOW)).toEqual(new Date("2027-11-05T10:00:00.000Z"));
  });
});

describe("IST date input conversion", () => {
  it("converts a date input to the end of that day in IST", () => {
    expect(fromIstDateInput("2026-10-31")).toEqual(new Date("2026-10-31T18:29:59.999Z"));
  });

  it("rejects a malformed date input", () => {
    expect(fromIstDateInput("31-10-2026")).toBeNull();
  });

  it("rejects an impossible date", () => {
    expect(fromIstDateInput("2026-13-01")).toBeNull();
  });

  it("round-trips an end-of-day instant back to its IST date", () => {
    expect(toIstDateInput(new Date("2026-10-31T18:29:59.999Z"))).toBe("2026-10-31");
  });

  it("maps a late-evening UTC instant to the next IST day", () => {
    expect(toIstDateInput(new Date("2026-10-31T19:00:00.000Z"))).toBe("2026-11-01");
  });
});
