import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function isValidRedirectPath(path: string): boolean {
  // Must start with / and not contain // (to prevent protocol-relative URLs)
  // Also must not contain : before / (to prevent javascript: or other protocol attacks)
  if (!path.startsWith("/")) return false;
  if (path.includes("//")) return false;
  if (path.indexOf(":") !== -1 && path.indexOf(":") < path.indexOf("/", 1)) return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/admin";
  
  // Validate the redirect path to prevent open redirect attacks
  const next = isValidRedirectPath(nextParam) ? nextParam : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
