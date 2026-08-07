import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { syncUserToMongo } from "@/lib/sync-user";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Guard against open redirects: only accept relative paths.
  const redirectPath =
    next && next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // getUser() is the authoritative source — do not use provider payloads.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await syncUserToMongo(user);
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
