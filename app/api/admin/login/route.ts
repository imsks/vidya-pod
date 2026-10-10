import { NextResponse } from "next/server";
import { validateAdminSecret } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { admin_secret?: string };
    const adminSecret = body.admin_secret?.trim();

    if (!adminSecret) {
      return NextResponse.json({ error: "Admin PIN is required" }, { status: 400 });
    }

    if (!validateAdminSecret(adminSecret)) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin PIN" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin login route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
