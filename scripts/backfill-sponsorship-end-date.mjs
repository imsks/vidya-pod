#!/usr/bin/env node
/**
 * One-time backfill: gives every already-sponsored learner a sponsorship end date.
 *
 *   docker compose exec app node scripts/backfill-sponsorship-end-date.mjs --target=local --dry-run
 *   docker compose exec app node scripts/backfill-sponsorship-end-date.mjs --target=local
 *
 * Only rows with a sponsor and no end date are touched, so re-running is safe.
 * A learner with no end date never lapses, which is why these rows need stamping.
 *
 * Credentials come from the env file for the chosen target (never from flags):
 *   local -> .env.local, falling back to .env
 *   prod  -> .env.production
 *
 * Required env var: DATABASE_URL. The local .env points at the compose host `db`,
 * which only resolves inside the compose network - run it via `docker compose exec app`,
 * or use a .env.local with a localhost DATABASE_URL to run it from the host.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseEnvFile } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const DEFAULT_CUTOFF = "2026-10-31";
const IST_OFFSET_MS = 330 * 60_000;
const ENV_FILES = {
  local: [".env.local", ".env"],
  prod: [".env.production"],
};

const parseArgs = (argv) => {
  const args = { target: "local", cutoff: DEFAULT_CUTOFF, dryRun: false };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("--target=")) {
      args.target = arg.slice("--target=".length);
    } else if (arg.startsWith("--cutoff=")) {
      args.cutoff = arg.slice("--cutoff=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!ENV_FILES[args.target]) {
    throw new Error(`--target must be one of: ${Object.keys(ENV_FILES).join(", ")}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.cutoff)) {
    throw new Error(`--cutoff must be in YYYY-MM-DD format, got: ${args.cutoff}`);
  }

  return args;
};

const loadDatabaseUrl = (target) => {
  const candidates = ENV_FILES[target];
  const envPath = candidates.map((name) => resolve(process.cwd(), name)).find(existsSync);

  if (!envPath) {
    throw new Error(
      `No env file found for target "${target}". Looked for: ${candidates.join(", ")}`,
    );
  }

  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  const databaseUrl = parsed.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL is missing from ${envPath}`);
  }

  return { databaseUrl, envPath };
};

/** End of the given YYYY-MM-DD in IST, as an absolute instant. */
const endOfIstDay = (isoDate) => {
  const endOfDayUtc = new Date(`${isoDate}T23:59:59.999Z`);

  if (Number.isNaN(endOfDayUtc.getTime())) {
    throw new Error(`Invalid cutoff date: ${isoDate}`);
  }

  return new Date(endOfDayUtc.getTime() - IST_OFFSET_MS);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const { databaseUrl, envPath } = loadDatabaseUrl(args.target);
  const cutoff = endOfIstDay(args.cutoff);

  console.log(`Target:  ${args.target} (${envPath})`);
  console.log(`Cutoff:  ${args.cutoff} end of day IST -> ${cutoff.toISOString()}`);
  console.log(`Mode:    ${args.dryRun ? "dry run" : "live"}`);

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const where = { sponsorId: { not: null }, sponsorshipEndsAt: null };

  try {
    const pending = await prisma.learner.count({ where });
    console.log(`Learners sponsored with no end date: ${pending}`);

    if (args.dryRun) {
      console.log("Dry run - nothing was written.");
      return;
    }

    if (pending === 0) {
      console.log("Nothing to backfill.");
      return;
    }

    const result = await prisma.learner.updateMany({
      where,
      data: { sponsorshipEndsAt: cutoff },
    });

    console.log(`Updated ${result.count} learner(s).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
