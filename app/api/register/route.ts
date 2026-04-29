import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { role, name, phone, qualification, standard } = body;

    if (!role || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["teacher", "student", "proctor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let result;

    if (role === "student") {
      if (!standard) {
        return NextResponse.json(
          { error: "Standard is required for students" },
          { status: 400 },
        );
      }
      result = await supabase.from("students").insert({ name, phone, standard });
    } else {
      if (!qualification) {
        return NextResponse.json(
          { error: "Qualification is required" },
          { status: 400 },
        );
      }
      const table = role === "teacher" ? "teachers" : "proctors";
      result = await supabase.from(table).insert({ name, phone, qualification });
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
