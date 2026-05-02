# GitHub Copilot Instructions — vidya-pod

Next.js 15 App Router + Supabase registration and exam management app.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **React**: React 19
- **Language**: TypeScript 5
- **UI**: Radix UI + Tailwind CSS v4 + lucide-react + sonner (toasts)
- **DB**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Validation**: Zod (in API routes)
- **Forms**: Local `useState` (no form library)

## Folder Structure
```
app/
├── layout.tsx        ← Root layout
├── page.tsx          ← Home page (server component)
├── api/              ← Route handlers (route.ts)
│   ├── register/     ← POST /api/register
│   ├── admin/        ← Admin API routes
│   └── sponsor/      ← Sponsor API routes
├── register/         ← Registration page
└── admin/            ← Admin page
src/
├── components/       ← Client page components ("use client")
├── constants/        ← pricing.ts, etc.
└── lib/
    ├── supabase.ts   ← getSupabase() singleton
    └── utils.ts
```

## API Route Pattern
```ts
// app/api/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  role: z.enum(["teacher", "student", "proctor"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const supabase = getSupabase();
    const result = await supabase.from("students").insert(parsed.data);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Supabase Singleton
```ts
// src/lib/supabase.ts — always use getSupabase(), never createClient() directly
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let _supabase: SupabaseClient | null = null;
export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return _supabase;
}
```

## Rules (Never Do This)
```ts
// ❌ Skip Zod validation
const { name } = await request.json();
// ✅ Always validate
const parsed = schema.safeParse(await request.json());
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 });

// ❌ createClient directly in route
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, key);
// ✅ singleton
import { getSupabase } from "@/lib/supabase";
const supabase = getSupabase();

// ❌ Hardcoded admin credentials (EXISTING BUG in register-page.tsx)
const ADMIN_ID = "sachin";
const ADMIN_PASSWORD = "sachin";
// ✅ Environment variables
const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ❌ Client component without "use client"
import { useState } from "react";  // will crash in App Router
// ✅ Add directive
"use client";
import { useState } from "react";
```

## ⚠️ Known Security Issue
`src/components/register-page.tsx` contains hardcoded admin credentials:
```ts
const ADMIN_ID = "sachin";
const ADMIN_PASSWORD = "sachin";
```
**This must be moved to environment variables immediately.** Use `ADMIN_PASSWORD` (server-only) and validate credentials via a secure API route, not client-side comparison.
