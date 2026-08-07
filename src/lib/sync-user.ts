import type { User } from "@supabase/supabase-js";
import { connectDB } from "@/lib/mongodb";
import { User as UserModel } from "@/lib/models";

/**
 * Synchronizes an authenticated Supabase user to MongoDB.
 *
 * - Creates a new document on first login.
 * - Updates email, name, avatar, and lastLoginAt on every subsequent login.
 * - Never creates duplicate documents (keyed on supabaseId).
 * - Non-fatal: if MongoDB is unavailable, authentication continues normally.
 */
export async function syncUserToMongo(user: User): Promise<void> {
  try {
    await connectDB();

    const meta = user.user_metadata as Record<string, string> | undefined;
    const fullName = meta?.full_name ?? meta?.name;
    const avatarUrl = meta?.avatar_url;

    await UserModel.findOneAndUpdate(
      { supabaseId: user.id },
      {
        $set: {
          email: user.email ?? "",
          ...(fullName !== undefined && { fullName }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          provider: "google",
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    // MongoDB sync is non-fatal. Log and let authentication proceed.
    console.error("[syncUserToMongo] Failed to sync user to MongoDB:", error);
  }
}
