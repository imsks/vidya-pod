import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { SESSION_COOKIE_NAME, verifySignedToken } from "@/lib/auth-utils";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySignedToken(token) : null;
}

// Item 12: Require authenticated session for reading learner feedbacks
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

    let query = supabase
      .from("learner_feedbacks")
      .select("*")
      .order("created_at", { ascending: false });

    if (podId) query = query.eq("pod_id", podId);
    if (studentId) query = query.eq("student_id", studentId);

    const { data: feedbacks, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const studentIds = Array.from(new Set((feedbacks || []).map((f) => f.student_id)));
    let studentMap = new Map();
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id, name")
        .in("id", studentIds);
      studentMap = new Map((students || []).map((s) => [s.id, s.name]));
    }

    const formatted = (feedbacks || []).map((f) => ({
      ...f,
      student_name: studentMap.get(f.student_id) || "Student",
    }));

    return NextResponse.json({ feedbacks: formatted });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Item 13: Derive author_id and author_role directly from authenticated session
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["teacher", "proctor", "admin"].includes(authUser.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Staff or Admin session required." },
        { status: 403 },
      );
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { pod_id, student_id, feedback_text, rating } = body;

    if (!pod_id || !student_id || !feedback_text) {
      return NextResponse.json(
        { error: "pod_id, student_id, and feedback_text are required" },
        { status: 400 },
      );
    }

    // Item 13: Derive author identity directly from verified session
    const { data, error } = await supabase
      .from("learner_feedbacks")
      .insert({
        pod_id,
        student_id,
        author_id: authUser.id,
        author_role: authUser.role as "teacher" | "proctor" | "admin",
        feedback_text,
        rating: rating || 5,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, feedback: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
