import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const memberId = searchParams.get("memberId");

    let query = supabase.from("pods").select("*").order("created_at", { ascending: false });

    if (podId) {
      query = query.eq("id", podId);
    }

    const { data: pods, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch memberships for these pods
    const podIds = (pods || []).map((p) => p.id);
    let memberships: any[] = [];
    if (podIds.length > 0) {
      const { data: mems } = await supabase
        .from("pod_memberships")
        .select("*")
        .in("pod_id", podIds);
      memberships = mems || [];
    }

    // Filter by memberId if provided
    let filteredPods = pods || [];
    if (memberId) {
      const userPodIds = new Set(
        memberships.filter((m) => m.member_id === memberId).map((m) => m.pod_id),
      );
      filteredPods = filteredPods.filter((p) => userPodIds.has(p.id));
    }

    // Fetch member details
    const [teachers, students, proctors, sponsors] = await Promise.all([
      supabase.from("teachers").select("id, name, phone, qualification, image_url"),
      supabase.from("students").select("id, name, phone, standard, image_url, has_app_access"),
      supabase.from("proctors").select("id, name, phone, qualification, image_url"),
      supabase.from("sponsor_orders").select("id, name, email, phone, plan, amount"),
    ]);

    const teacherMap = new Map((teachers.data || []).map((t) => [t.id, t]));
    const studentMap = new Map((students.data || []).map((s) => [s.id, s]));
    const proctorMap = new Map((proctors.data || []).map((p) => [p.id, p]));
    const sponsorMap = new Map((sponsors.data || []).map((s) => [s.id, s]));

    const detailedPods = filteredPods.map((pod) => {
      const podMems = memberships.filter((m) => m.pod_id === pod.id);

      const podTeachers = podMems
        .filter((m) => m.role === "teacher")
        .map((m) => ({ ...teacherMap.get(m.member_id), role: "teacher" }))
        .filter((t) => t.id);

      const podStudents = podMems
        .filter((m) => m.role === "student")
        .map((m) => ({ ...studentMap.get(m.member_id), role: "student" }))
        .filter((s) => s.id);

      const podProctors = podMems
        .filter((m) => m.role === "proctor")
        .map((m) => ({ ...proctorMap.get(m.member_id), role: "proctor" }))
        .filter((p) => p.id);

      const podDonors = podMems
        .filter((m) => m.role === "donor")
        .map((m) => ({ ...sponsorMap.get(m.member_id), role: "donor" }))
        .filter((d) => d.id);

      return {
        ...pod,
        teachers: podTeachers,
        students: podStudents,
        proctors: podProctors,
        donors: podDonors,
      };
    });

    return NextResponse.json({ pods: detailedPods });
  } catch (err) {
    console.error("Error in GET /api/pods:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { action, name, location, description, podId, memberId, role } = body;

    // Action 1: Create POD
    if (action === "create_pod" || (!action && name && location)) {
      if (!name || !location) {
        return NextResponse.json(
          { error: "POD name and location are required" },
          { status: 400 },
        );
      }

      const code = `POD-${name.replace(/\s+/g, "").toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: pod, error } = await supabase
        .from("pods")
        .insert({
          name,
          code,
          location,
          description: description || "",
          status: "ACTIVE",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, pod });
    }

    // Action 2: Assign Member to POD
    if (action === "assign_member") {
      if (!podId || !memberId || !role) {
        return NextResponse.json(
          { error: "podId, memberId, and role are required" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("pod_memberships")
        .upsert(
          { pod_id: podId, member_id: memberId, role },
          { onConflict: "pod_id,member_id,role" },
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, membership: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in POST /api/pods:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const memberId = searchParams.get("memberId");

    if (podId && memberId) {
      const { error } = await supabase
        .from("pod_memberships")
        .delete()
        .eq("pod_id", podId)
        .eq("member_id", memberId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (podId) {
      const { error } = await supabase.from("pods").delete().eq("id", podId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing podId or memberId" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
