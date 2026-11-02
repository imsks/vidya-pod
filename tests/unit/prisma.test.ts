import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaClientInstance = { tag: "prisma-client" };
const { poolConfigs } = vi.hoisted(() => ({ poolConfigs: [] as Record<string, unknown>[] }));

vi.mock("pg", () => ({
  Pool: class Pool {
    query = vi.fn();
    constructor(config: Record<string, unknown>) {
      poolConfigs.push(config);
    }
  },
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class PrismaPg {
    constructor() {}
  },
}));

vi.mock("@/generated/prisma", () => ({
  PrismaClient: class PrismaClient {
    constructor() {
      return prismaClientInstance;
    }
  },
}));

describe("getPrisma", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    poolConfigs.length = 0;
    const cache = globalThis as { prisma?: unknown; pgPool?: unknown };
    delete cache.prisma;
    delete cache.pgPool;
  });

  it("returns a lazily initialized Prisma client singleton", async () => {
    const { getPrisma } = await import("@/lib/prisma");

    const first = getPrisma();
    const second = getPrisma();

    expect(first).toBe(prismaClientInstance);
    expect(second).toBe(first);
  });

  it("caps the pg pool so instances cannot exhaust the Supabase pooler", async () => {
    const { getPrisma } = await import("@/lib/prisma");

    getPrisma();

    expect(poolConfigs).toHaveLength(1);
    expect(poolConfigs[0]).toMatchObject({ max: 3 });
  });

  it("lets DATABASE_POOL_MAX override the pool size", async () => {
    vi.stubEnv("DATABASE_POOL_MAX", "8");
    const { getPrisma } = await import("@/lib/prisma");

    getPrisma();

    expect(poolConfigs[0]).toMatchObject({ max: 8 });
  });
});
