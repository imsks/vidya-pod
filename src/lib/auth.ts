import { createClient } from "@/utils/supabase/client";

export async function signInWithGoogle(next?: string) {
  const supabase = createClient();

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  if (next) {
    callbackUrl.searchParams.set("next", next);
  }
  const redirectTo = callbackUrl.toString();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
