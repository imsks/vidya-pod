import { describe, expect, it } from "vitest";

describe("application smoke integration", () => {
  it("loads the test environment correctly", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});