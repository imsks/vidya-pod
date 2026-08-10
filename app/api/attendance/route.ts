import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { SESSION_COOKIE_NAME, verifySignedToken } from "@/lib/auth-utils";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySignedToken(token) : null;
}

// Item 3: Require authentication and scope attendance queries by role
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const studentId = searchParams.get("studentId");
    const date = searchParams.get("date");

    let query = supabase.from("attendance_records").select("*").order("date", { ascending: false });

    // Item 3 Scope Rule: Students can strictly ONLY query their own attendance
    if (authUser.role === "student") {
      query = query.eq("student_id", authUser.id);
    } else if (studentId) {
      query = query.eq("student_id", studentId);
    }

    if (podId) query = query.eq("pod_id", podId);
    if (date) query = query.eq("date", date);

    const { data: records, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Item 11: Derive proctor_id from authenticated session & validate POD access
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["proctor", "admin"].includes(authUser.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Only assigned Proctors or Admins can record attendance." },
        { status: 403 },
      );
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { pod_id, records, date } = body as {
      pod_id: string;
      date?: string;
      records: Array<{
        student_id: string;
        status: "PRESENT" | "ABSENT" | "EXCUSED";
        notes?: string;
      }>;
    };

    if (!pod_id || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "pod_id and records array are required" }, { status: 400 });
    }

    // Verify Proctor is assigned to the target POD before writing attendance
    if (authUser.role === "proctor") {
      const { data: membership } = await supabase
        .from("pod_memberships")
        .select("*")
        .eq("pod_id", pod_id)
        .eq("member_id", authUser.id)
        .eq("role", "proctor")
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "Unauthorized. Proctors can only record attendance for their assigned POD." },
          { status: 403 },
        );
      }
    }

    const attendanceDate = date || new Date().toISOString().split("T")[0];

    const rowsToUpsert = records.map((r) => ({
      pod_id,
      student_id: r.student_id,
      proctor_id: authUser.role === "proctor" ? authUser.id : null,
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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
