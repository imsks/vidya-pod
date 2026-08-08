import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const studentId = searchParams.get("studentId");

    let query = supabase.from("learner_feedbacks").select("*").order("created_at", { ascending: false });

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
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { pod_id, student_id, author_id, author_role, feedback_text, rating } = body;

    if (!pod_id || !student_id || !author_id || !author_role || !feedback_text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("learner_feedbacks")
      .insert({
        pod_id,
        student_id,
        author_id,
        author_role,
        feedback_text,
        rating: rating || 5,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
