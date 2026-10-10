import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaClientInstance = { tag: "prisma-client" };

vi.mock("pg", () => ({
  Pool: class Pool {
    query = vi.fn();
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
  });

  it("returns a lazily initialized Prisma client singleton", async () => {
    const { getPrisma } = await import("@/lib/prisma");

    const first = getPrisma();
    const second = getPrisma();

    expect(first).toBe(prismaClientInstance);
    expect(second).toBe(first);
  });
});
