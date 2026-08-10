import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSupabaseAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when service role key is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;

    const { getSupabaseAdmin } = await import("@/lib/supabase");

    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("returns a singleton admin client when configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_key";

    const { getSupabaseAdmin } = await import("@/lib/supabase");

    const first = getSupabaseAdmin();
    const second = getSupabaseAdmin();

    expect(first).toBe(second);
  });
});
