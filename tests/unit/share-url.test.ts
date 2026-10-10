import { afterEach, describe, expect, it } from "vitest";
import {
  buildShareMessage,
  buildSocialShareLinks,
  buildSponsorshipShareUrl,
  generateShareSlug,
  getAppBaseUrl,
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

describe("buildSponsorshipShareUrl", () => {
  it("builds a public url for a valid slug", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidyapods.com";
    expect(buildSponsorshipShareUrl("abcdefghijklmnop")).toBe(
      "https://vidyapods.com/sponsorship/abcdefghijklmnop",
    );
  });

  it("returns null for missing or invalid slugs", () => {
    expect(buildSponsorshipShareUrl(null)).toBeNull();
    expect(buildSponsorshipShareUrl(undefined)).toBeNull();
    expect(buildSponsorshipShareUrl("bad slug")).toBeNull();
  });
});

describe("buildShareMessage", () => {
  it("includes the learner name when available", () => {
    expect(buildShareMessage("Asha")).toContain("Asha");
    expect(buildShareMessage(null)).toContain("a learner");
  });
});

describe("buildSocialShareLinks", () => {
  it("encodes the share url and message", () => {
    const links = buildSocialShareLinks("https://vidyapods.com/sponsorship/abc", "Hello & welcome");

    expect(links.twitter).toContain("Hello%20%26%20welcome");
    expect(links.twitter).toContain("https%3A%2F%2Fvidyapods.com%2Fsponsorship%2Fabc");
    expect(links.whatsapp).toContain("https://wa.me/?text=");
    expect(links.facebook).toContain("facebook.com/sharer");
    expect(links.linkedin).toContain("linkedin.com/sharing");
  });
});
