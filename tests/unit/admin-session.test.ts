import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearAdminSessionPin, getAdminSessionPin, setAdminSessionPin } from "@/lib/admin-session";

describe("admin-session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("stores and reads the admin pin from session storage", () => {
    expect(getAdminSessionPin()).toBeNull();
    setAdminSessionPin("secret-pin");
    expect(getAdminSessionPin()).toBe("secret-pin");
  });

  it("clears the admin pin from session storage", () => {
    setAdminSessionPin("secret-pin");
    clearAdminSessionPin();
    expect(getAdminSessionPin()).toBeNull();
  });
});
