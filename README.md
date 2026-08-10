# Vidya Pod

Next.js app for student/teacher/proctor registration, sponsorship payments (Cashfree), and a simple admin view. Database access uses **Prisma** (local Docker Postgres or Supabase Postgres in production). **Supabase** is optional for Auth and Storage — add your own cloud project creds when needed.

## Prerequisites

- Node.js 20+ (host dev only)
- npm (host dev only)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Quick start (Docker — app + Postgres)

1. Copy env and start containers:

```bash
cp .env.example .env
make up
```

2. Open [http://localhost:3000](http://localhost:3000).

Migrations run automatically when the app container starts. Logs: `docker compose logs -f app`.

---

## Host dev (optional — faster HMR)

Run Postgres in Docker, Next.js on your machine:

```bash
cp .env.example .env
make stop && docker compose up db -d
cp .env.example .env.local   # set DATABASE_URL to localhost (see .env.example)
make migrate
npm run dev
```

| Variable                               | Where to get it                                            |
| -------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                         | `.env.example` (local Docker) or Supabase Dashboard (prod) |
| `NEXT_PUBLIC_SUPABASE_URL`             | Optional — Supabase Dashboard → Project Settings → API     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional — same page → publishable / anon key              |
| `SUPABASE_SECRET_KEY`                | Optional — Settings → API Keys → **Secret key** (`sb_secret_...`, server-only; required for photo uploads) |
| `CASHFREE_*`                           | Cashfree merchant dashboard (sandbox for local)            |
| `NEXT_PUBLIC_APP_URL`                  | `http://localhost:3000` for local dev                      |

---

## Make commands

| Command        | Description                                              |
| -------------- | -------------------------------------------------------- |
| `make up`      | Build and start app + Postgres (detached)                |
| `make stop`    | Stop all containers                                      |
| `make migrate` | Apply Prisma migrations on host (uses `.env`, localhost) |

Env files: `.env` for Docker Compose, `.env.local` for host Next.js dev.

Reset the database: `make stop && docker compose down -v && make up`

### Notes

- Postgres exposes port **5432** on the host. Stop any local Postgres instance if the port is already in use.
- Never put the **secret key** (`SUPABASE_SECRET_KEY`) in `NEXT_PUBLIC_*` variables.

---

## Scripts

| Command                     | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `npm run dev`               | Next.js dev server (host)                       |
| `npm run build`             | Production build                                |
| `npm run start`             | Serve production build                          |
| `npm run lint`              | ESLint check                                    |
| `npm run lint:fix`          | ESLint with autofix                             |
| `npm run format`            | Prettier write                                  |
| `npm run format:check`      | Prettier check (CI)                             |
| `npm run typecheck`         | TypeScript `--noEmit`                           |
| `npm run quality:check`     | format + lint + typecheck + coverage            |
| `npm run test`              | Unit + integration (Vitest)                     |
| `npm run test:watch`        | Vitest watch mode                               |
| `npm run test:coverage`     | Coverage with thresholds (`src/lib`, constants) |
| `npm run test:e2e`          | Playwright E2E (Chromium)                       |
| `npm run db:migrate`        | Create/apply Prisma migrations (dev)            |
| `npm run db:migrate:deploy` | Apply migrations (CI)                           |
| `npm run db:studio`         | Prisma Studio                                   |

Pre-commit runs `lint-staged` (ESLint `--fix` + Prettier) via Husky.

CI (`.github/workflows/ci.yml`) runs quality checks, then build + E2E against `npm start`.
