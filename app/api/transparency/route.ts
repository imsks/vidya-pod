import { NextResponse } from "next/server";
import { internalError } from "@/lib/api/respond";
import { getTransparencySummary } from "@/lib/data/transparency";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTransparencySummary(getPrisma()));
  } catch (error) {
    return internalError(error, "Error loading transparency summary", "Unable to load figures");
  }
}
