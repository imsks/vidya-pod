import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_SECRET_HEADER,
  getAdminSecretFromRequest,
  validateAdminSecret,
} from "@/lib/admin-auth";

describe("admin-auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_SECRET: "test-secret-123" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when secret matches ADMIN_SECRET", () => {
    expect(validateAdminSecret("test-secret-123")).toBe(true);
  });

  it("returns false when secret does not match", () => {
    expect(validateAdminSecret("wrong-secret")).toBe(false);
  });

  it("returns false when secret is missing", () => {
    expect(validateAdminSecret(null)).toBe(false);
    expect(validateAdminSecret(undefined)).toBe(false);
    expect(validateAdminSecret("")).toBe(false);
  });

  it("returns false when ADMIN_SECRET env is not set", () => {
    delete process.env.ADMIN_SECRET;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(validateAdminSecret("test-secret-123")).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith("ADMIN_SECRET environment variable is not set");

    warnSpy.mockRestore();
  });

  it("reads admin secret from request header", () => {
    const request = new Request("http://localhost/api/admin", {
      headers: { [ADMIN_SECRET_HEADER]: "test-secret-123" },
    });

    expect(getAdminSecretFromRequest(request)).toBe("test-secret-123");
  });

  it("returns null when admin secret header is missing", () => {
    const request = new Request("http://localhost/api/admin");
    expect(getAdminSecretFromRequest(request)).toBeNull();
  });
});
