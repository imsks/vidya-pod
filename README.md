# Vidya Pod

Next.js app for student/teacher/proctor registration, sponsorship payments (Cashfree), and a simple admin view. Data is stored in Supabase (Postgres + optional Storage and other services via `@supabase/supabase-js`).

## Prerequisites

- Node.js 20+
- npm

## Quick start (hosted Supabase)

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy env template and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page → publishable / anon key |
| `CASHFREE_*` | Cashfree merchant dashboard (sandbox for local) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

3. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication (Google OAuth)

This app uses Supabase Authentication with Google OAuth for admin access. The admin panel (`/admin`) and registration page (`/register`) are protected routes.

### Setup Google OAuth

1. **Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" → "Credentials"
   - Create OAuth 2.0 Client ID (Web Application type)
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret

2. **Supabase Dashboard:**
   - Go to Authentication → Providers → Google
   - Enable Google Provider
   - Paste your Google Client ID and Client Secret
   - Save the configuration

3. **Configure Redirect URLs:**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your site URL (e.g., `https://your-domain.com`)
   - Add redirect URLs for both development and production

### Auth Flow

1. User visits `/admin` or `/register`
2. Middleware redirects unauthenticated users to `/login`
3. User clicks "Continue with Google"
4. After successful OAuth, user is redirected back to the originally requested page

### Admin Access

For beta, any user who successfully authenticates via Google can access the admin panel. For production, you may want to:

1. Use the `admin_users` table to restrict access to specific email addresses
2. Implement role-based access control using the `role` column

---

## Full local Supabase (optional)

Use this if you want Postgres, Auth, Storage, and Studio running entirely on your machine — no cloud project required for day-to-day testing.

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
# macOS
brew install supabase/tap/supabase
```

### 1. Initialize (once per clone)

From the project root:

```bash
supabase init
```

This creates a `supabase/` folder (config + migrations). Commit it so the team shares the same schema.

### 2. Start the local stack

```bash
supabase start
```

On success the CLI prints local URLs and keys. Typical defaults:

| Service | URL |
|---|---|
| API (use as `NEXT_PUBLIC_SUPABASE_URL`) | `http://127.0.0.1:54321` |
| Studio (DB UI) | [http://127.0.0.1:54323](http://127.0.0.1:54323) |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Re-print keys anytime:

```bash
supabase status
```

### 3. Point the app at local Supabase

Update `.env.local` (do not commit this file):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase start / status>

# Cashfree can stay on sandbox while you test payments
CASHFREE_CLIENT_ID=your-client-id
CASHFREE_SECRET_KEY=your-secret-key
CASHFREE_BASE_URL=https://sandbox.cashfree.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The publishable key is the **anon** key printed by the CLI (same value; naming differs between older and newer Supabase docs).

### 4. Apply schema

Create and edit migrations under `supabase/migrations/`, then reset the local DB:

```bash
supabase migration new create_core_tables
# edit the generated SQL file, then:
supabase db reset
```

`db reset` applies all migrations and any `supabase/seed.sql` if present.

### 5. Run the app

```bash
npm run dev
```

The client in `src/lib/supabase.ts` reads the same env vars whether you use cloud or local — no code changes needed.

### Useful commands

```bash
supabase status    # URLs + keys
supabase stop      # stop containers
supabase db reset  # wipe local DB and re-apply migrations
supabase migration new <name>
```

### Notes

- Keep cloud credentials in `.env.production` (or your host’s env UI). Use `.env.local` for either cloud-dev or `127.0.0.1`.
- Never put the **service_role** key in `NEXT_PUBLIC_*` variables.
- Local Studio at port `54323` is handy for inspecting tables and Storage buckets while developing.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Lint |
