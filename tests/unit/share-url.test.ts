import { afterEach, describe, expect, it } from "vitest";
import {
  buildShareCaption,
  buildShareMessage,
  buildSponsorInviteUrl,
  generateShareSlug,
  getAppBaseUrl,
  getAppDomain,
  isValidShareSlug,
} from "@/lib/sponsorship/share-url";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("generateShareSlug", () => {
  it("generates url-safe slugs", () => {
    const slug = generateShareSlug();
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isValidShareSlug(slug)).toBe(true);
  });

  it("generates unique slugs", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateShareSlug()));
    expect(slugs.size).toBe(100);
  });
});

describe("isValidShareSlug", () => {
  it("rejects malformed slugs", () => {
    expect(isValidShareSlug("")).toBe(false);
    expect(isValidShareSlug("short")).toBe(false);
    expect(isValidShareSlug("../../etc/passwd")).toBe(false);
    expect(isValidShareSlug(`${"a".repeat(65)}`)).toBe(false);
  });
});

describe("getAppBaseUrl", () => {
  it("strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidyapods.com//";
    expect(getAppBaseUrl()).toBe("https://vidyapods.com");
  });

  it("falls back to localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("getAppDomain", () => {
  it("strips the protocol", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidyapods.com";
    expect(getAppDomain()).toBe("vidyapods.com");
  });
});

describe("buildSponsorInviteUrl", () => {
  it("points at the sponsor page", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidyapods.com";
    expect(buildSponsorInviteUrl()).toBe("https://vidyapods.com/sponsor");
  });
});

describe("buildShareMessage", () => {
  it("includes the learner name when available", () => {
    expect(buildShareMessage("Asha")).toContain("Asha");
    expect(buildShareMessage(null)).toContain("a learner");
  });
});

describe("buildShareCaption", () => {
  it("appends the sponsor invite url to the message", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidyapods.com";
    const caption = buildShareCaption("Asha");

    expect(caption).toContain("Asha");
    expect(caption.endsWith("https://vidyapods.com/sponsor")).toBe(true);
  });
});
