import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const [teachers, students, proctors, sponsors] = await Promise.all([
      supabase.from("teachers").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("proctors").select("*").order("created_at", { ascending: false }),
      supabase.from("sponsor_orders").select("*").order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      teachers: teachers.data ?? [],
      students: students.data ?? [],
      proctors: proctors.data ?? [],
      sponsors: sponsors.data ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
