import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { SESSION_COOKIE_NAME, verifySignedToken } from "@/lib/auth-utils";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySignedToken(token) : null;
}

// Item 17 & 19: Require Proctor/Admin session and ensure atomic learner creation & POD assignment
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["proctor", "admin"].includes(authUser.role)) {
      return NextResponse.json(
        { error: "Unauthorized. Proctor or Admin session required to onboard learners." },
        { status: 403 },
      );
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { name, phone, standard, pod_id, has_app_access, image_url } = body;

    if (!name || !standard || !pod_id) {
      return NextResponse.json(
        { error: "Learner name, standard, and pod_id are required" },
        { status: 400 },
      );
    }

    // 1. Create learner record in `students` table
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        name,
        phone: phone || "",
        standard,
        image_url: image_url || undefined,
        has_app_access: has_app_access ?? false,
      })
      .select()
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: studentError?.message || "Failed to create learner profile" },
        { status: 500 },
      );
    }

    // 2. Assign learner to the POD
    const { error: memError } = await supabase.from("pod_memberships").insert({
      pod_id,
      member_id: student.id,
      role: "student",
    });

    // Item 19: Atomic rollback cleanup if membership creation fails
    if (memError) {
      await supabase.from("students").delete().eq("id", student.id);
      return NextResponse.json(
        {
          error: `Failed to assign learner to POD: ${memError.message}. Learner record rolled back.`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      learner: student,
      message: `Successfully onboarded ${name} into POD`,
    });
  } catch (err) {
    console.error("Error in onboard-learner route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
