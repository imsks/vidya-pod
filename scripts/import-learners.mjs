#!/usr/bin/env node
/**
 * Bulk-imports learners from a local JSON file into a running Vidya Pods instance.
 *
 *   node scripts/import-learners.mjs --target=local
 *   node scripts/import-learners.mjs --target=prod
 *   node scripts/import-learners.mjs --target=prod --file=data/learners.json
 *   node scripts/import-learners.mjs --dry-run
 *
 * Credentials come from the env file for the chosen target (never from flags),
 * matching the convention used by the Makefile:
 *   local -> .env.local, falling back to .env
 *   prod  -> .env.production
 *
 * Required env vars: ADMIN_SECRET, and NEXT_PUBLIC_APP_URL (or IMPORT_BASE_URL).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseEnvFile } from "dotenv";

const DEFAULT_FILE = "data/learners.json";
const ENV_FILES = {
  local: [".env.local", ".env"],
  prod: [".env.production"],
};

const parseArgs = (argv) => {
  const args = { target: "local", file: DEFAULT_FILE, dryRun: false, allowDuplicates: false };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--allow-duplicates") {
      args.allowDuplicates = true;
    } else if (arg.startsWith("--target=")) {
      args.target = arg.slice("--target=".length);
    } else if (arg.startsWith("--file=")) {
      args.file = arg.slice("--file=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!ENV_FILES[args.target]) {
    throw new Error(`--target must be one of: ${Object.keys(ENV_FILES).join(", ")}`);
  }

  return args;
};

const loadEnv = (target) => {
  const candidates = ENV_FILES[target];
  const envPath = candidates.map((name) => resolve(process.cwd(), name)).find(existsSync);

  if (!envPath) {
    throw new Error(
      `No env file found for target "${target}". Looked for: ${candidates.join(", ")}`,
    );
  }

  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  const baseUrl = parsed.IMPORT_BASE_URL || parsed.NEXT_PUBLIC_APP_URL;
  const adminSecret = parsed.ADMIN_SECRET;

  if (!adminSecret) {
    throw new Error(`ADMIN_SECRET is missing from ${envPath}`);
  }
  if (!baseUrl) {
    throw new Error(`NEXT_PUBLIC_APP_URL (or IMPORT_BASE_URL) is missing from ${envPath}`);
  }

  return { envPath, baseUrl: baseUrl.replace(/\/+$/, ""), adminSecret };
};

const readLearners = (file) => {
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    throw new Error(`Learner file not found: ${path}`);
  }

  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const learners = Array.isArray(parsed) ? parsed : parsed.learners;

  if (!Array.isArray(learners)) {
    throw new Error(`${path} must be a JSON array, or an object with a "learners" array`);
  }

  return { path, learners };
};

/** Mirrors the server-side Zod schema so bad rows fail before any network call. */
const toPayload = (entry, index) => {
  const row = `row ${index + 1}`;

  if (typeof entry !== "object" || entry === null) {
    throw new Error(`${row}: expected an object`);
  }

  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  const standard = entry.standard == null ? "" : String(entry.standard).trim();

  if (!name) throw new Error(`${row}: "name" is required`);
  if (!standard) throw new Error(`${row}: "standard" is required`);

  const payload = { name, standard };

  if (entry.phone != null && String(entry.phone).trim()) {
    payload.phone = String(entry.phone).trim();
  }

  if (entry.image_url != null && String(entry.image_url).trim()) {
    const imageUrl = String(entry.image_url).trim();
    try {
      new URL(imageUrl);
    } catch {
      throw new Error(`${row}: "image_url" must be a valid URL`);
    }
    payload.image_url = imageUrl;
  }

  if (entry.sponsor_id != null && String(entry.sponsor_id).trim()) {
    payload.sponsor_id = String(entry.sponsor_id).trim();
  }

  return payload;
};

const dedupeKey = (learner) => `${learner.name.trim().toLowerCase()}|${String(learner.standard)}`;

const fetchExistingKeys = async (baseUrl, adminSecret) => {
  const res = await fetch(`${baseUrl}/api/admin`, {
    headers: { "x-admin-secret": adminSecret },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Could not read existing learners (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return new Set((data.learners ?? []).map(dedupeKey));
};

const postLearner = async (baseUrl, adminSecret, payload) => {
  const res = await fetch(`${baseUrl}/api/learner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_secret: adminSecret, ...payload }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return body;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const { envPath, baseUrl, adminSecret } = loadEnv(args.target);
  const { path, learners } = readLearners(args.file);

  console.log(`Target     : ${args.target} (${baseUrl})`);
  console.log(`Env file   : ${envPath}`);
  console.log(`Source     : ${path}`);
  console.log(`Learners   : ${learners.length}${args.dryRun ? " (dry run)" : ""}\n`);

  const payloads = learners.map(toPayload);

  const existingKeys = args.allowDuplicates
    ? new Set()
    : await fetchExistingKeys(baseUrl, adminSecret);

  let created = 0;
  let skipped = 0;
  const failures = [];

  for (const [index, payload] of payloads.entries()) {
    const label = `${index + 1}/${payloads.length} ${payload.name} (class ${payload.standard})`;
    const key = dedupeKey(payload);

    if (existingKeys.has(key)) {
      console.log(`- skip   ${label} — already exists`);
      skipped += 1;
      continue;
    }

    if (args.dryRun) {
      console.log(`- would create ${label}`);
      existingKeys.add(key);
      created += 1;
      continue;
    }

    try {
      const result = await postLearner(baseUrl, adminSecret, payload);
      existingKeys.add(key);
      created += 1;
      console.log(`- ok     ${label} → ${result.learner?.id ?? "created"}`);
      if (result.warning) {
        console.log(`         warning: ${result.warning}`);
      }
    } catch (error) {
      failures.push({ label, message: error.message });
      console.error(`- FAIL   ${label} — ${error.message}`);
    }
  }

  console.log(
    `\nDone. created=${created} skipped=${skipped} failed=${failures.length}${
      args.dryRun ? " (nothing was written)" : ""
    }`,
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(`\nImport aborted: ${error.message}`);
  process.exitCode = 1;
});
