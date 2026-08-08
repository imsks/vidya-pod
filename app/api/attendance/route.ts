import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const studentId = searchParams.get("studentId");
    const date = searchParams.get("date");

    let query = supabase.from("attendance_records").select("*").order("date", { ascending: false });

    if (podId) query = query.eq("pod_id", podId);
    if (studentId) query = query.eq("student_id", studentId);
    if (date) query = query.eq("date", date);

    const { data: records, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch student names for display
    const studentIds = Array.from(new Set((records || []).map((r) => r.student_id)));
    let studentMap = new Map();

    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id, name")
        .in("id", studentIds);
      studentMap = new Map((students || []).map((s) => [s.id, s.name]));
    }

    const formatted = (records || []).map((r) => ({
      ...r,
      student_name: studentMap.get(r.student_id) || "Unknown Student",
    }));

    return NextResponse.json({ records: formatted });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { pod_id, records, proctor_id, date } = body as {
      pod_id: string;
      proctor_id?: string;
      date?: string;
      records: Array<{
        student_id: string;
        status: "PRESENT" | "ABSENT" | "EXCUSED";
        notes?: string;
      }>;
    };

    if (!pod_id || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "pod_id and records array are required" },
        { status: 400 },
      );
    }

    const attendanceDate = date || new Date().toISOString().split("T")[0];

    const rowsToUpsert = records.map((r) => ({
      pod_id,
      student_id: r.student_id,
      proctor_id: proctor_id || null,
      date: attendanceDate,
      status: r.status,
      notes: r.notes || "",
    }));

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(rowsToUpsert, { onConflict: "pod_id,student_id,date" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, saved: data });
  } catch (err) {
    console.error("Error in attendance API:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
