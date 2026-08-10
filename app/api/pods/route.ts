import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { SESSION_COOKIE_NAME, verifySignedToken } from "@/lib/auth-utils";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySignedToken(token) : null;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const authUser = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get("podId");
    const memberId = searchParams.get("memberId");

    let query = supabase.from("pods").select("*").order("created_at", { ascending: false });

    if (podId) query = query.eq("id", podId);

    const { data: pods, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const podIds = (pods || []).map((p) => p.id);
    let memberships: Array<{ pod_id: string; member_id: string; role: string }> = [];
    if (podIds.length > 0) {
      const { data: mems } = await supabase
        .from("pod_memberships")
        .select("*")
        .in("pod_id", podIds);
      memberships = mems || [];
    }

    let filteredPods = pods || [];
    if (memberId) {
      const userPodIds = new Set(
        memberships.filter((m) => m.member_id === memberId).map((m) => m.pod_id),
      );
      filteredPods = filteredPods.filter((p) => userPodIds.has(p.id));
    }

    // Item 7: Redact sensitive contact information unless caller is authenticated Admin or assigned member
    const isAuthorizedAdmin = authUser?.role === "admin";

    const [teachers, students, proctors, sponsors] = await Promise.all([
      supabase.from("teachers").select("id, name, phone, qualification, image_url"),
      supabase.from("students").select("id, name, phone, standard, image_url, has_app_access"),
      supabase.from("proctors").select("id, name, phone, qualification, image_url"),
      supabase.from("sponsor_orders").select("id, name, email, phone, plan, amount"),
    ]);

    const sanitizeUser = <T extends { id?: string; phone?: string; email?: string }>(u: T): T => {
      if (isAuthorizedAdmin || authUser?.id === u.id) return u;
      // Redact sensitive phone/email for unauthorized viewers
      return {
        ...u,
        phone: u.phone ? `******${u.phone.slice(-4)}` : undefined,
        email: u.email ? `***@${u.email.split("@")[1] || "domain.com"}` : undefined,
      };
    };

    const teacherMap = new Map((teachers.data || []).map((t) => [t.id, sanitizeUser(t)]));
    const studentMap = new Map((students.data || []).map((s) => [s.id, sanitizeUser(s)]));
    const proctorMap = new Map((proctors.data || []).map((p) => [p.id, sanitizeUser(p)]));
    const sponsorMap = new Map((sponsors.data || []).map((s) => [s.id, sanitizeUser(s)]));

    const detailedPods = filteredPods.map((pod) => {
      const podMems = memberships.filter((m) => m.pod_id === pod.id);

      return {
        ...pod,
        teachers: podMems
          .filter((m) => m.role === "teacher")
          .map((m) => ({ ...teacherMap.get(m.member_id), role: "teacher" }))
          .filter((t) => t.id),
        students: podMems
          .filter((m) => m.role === "student")
          .map((m) => ({ ...studentMap.get(m.member_id), role: "student" }))
          .filter((s) => s.id),
        proctors: podMems
          .filter((m) => m.role === "proctor")
          .map((m) => ({ ...proctorMap.get(m.member_id), role: "proctor" }))
          .filter((p) => p.id),
        donors: podMems
          .filter((m) => m.role === "donor")
          .map((m) => ({ ...sponsorMap.get(m.member_id), role: "donor" }))
          .filter((d) => d.id),
      };
    });

    return NextResponse.json({ pods: detailedPods });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Item 8: Mandate Admin Role check for POD creation and member assignment
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin privilege required for POD mutations." },
        { status: 403 },
      );
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { action, name, location, description, podId, memberId, role } = body;

    if (action === "create_pod" || (!action && name && location)) {
      if (!name || !location) {
        return NextResponse.json({ error: "POD name and location are required" }, { status: 400 });
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
          created_by: authUser.id !== "admin-sachin" ? authUser.id : null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, pod });
    }

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

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, membership: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Item 9: Require verified Admin session for POD deletion
export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin privilege required for deletion." },
        { status: 403 },
      );
    }

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
