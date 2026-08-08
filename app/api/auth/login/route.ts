import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { UserRole } from "@/types/rbac";

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { role, identifier, password } = body as {
      role: UserRole;
      identifier: string;
      password?: string;
    };

    if (!role || !identifier) {
      return NextResponse.json(
        { error: "Role and identifier are required" },
        { status: 400 },
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. ADMIN LOGIN
    if (role === "admin") {
      // Dev fallback credentials
      if (cleanIdentifier === "sachin" && password === "sachin") {
        return NextResponse.json({
          user: {
            id: "admin-sachin",
            name: "Sachin Admin",
            role: "admin",
            username: "sachin",
          },
        });
      }

      // Supabase DB check
      const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", cleanIdentifier)
        .single();

      if (error || !admin || (password && admin.password !== password)) {
        return NextResponse.json(
          { error: "Invalid admin credentials" },
          { status: 401 },
        );
      }

      return NextResponse.json({
        user: {
          id: admin.id,
          name: admin.name,
          role: "admin",
          email: admin.email,
        },
      });
    }

    // 2. TEACHER LOGIN
    if (role === "teacher") {
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("*")
        .or(`phone.eq.${identifier},name.ilike.%${identifier}%`)
        .limit(1)
        .maybeSingle();

      if (error || !teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found. Please register first." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        user: {
          id: teacher.id,
          name: teacher.name,
          role: "teacher",
          phone: teacher.phone,
          qualification: teacher.qualification,
          imageUrl: teacher.image_url,
        },
      });
    }

    // 3. STUDENT / LEARNER LOGIN
    if (role === "student") {
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .or(`phone.eq.${identifier},name.ilike.%${identifier}%`)
        .limit(1)
        .maybeSingle();

      if (error || !student) {
        return NextResponse.json(
          { error: "Learner profile not found." },
          { status: 404 },
        );
      }

      if (student.has_app_access === false) {
        return NextResponse.json(
          {
            error:
              "App access is currently disabled for this offline learner profile. Please contact your Proctor.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json({
        user: {
          id: student.id,
          name: student.name,
          role: "student",
          phone: student.phone,
          standard: student.standard,
          imageUrl: student.image_url,
          hasAppAccess: student.has_app_access ?? true,
        },
      });
    }

    // 4. PROCTOR LOGIN
    if (role === "proctor") {
      const { data: proctor, error } = await supabase
        .from("proctors")
        .select("*")
        .or(`phone.eq.${identifier},name.ilike.%${identifier}%`)
        .limit(1)
        .maybeSingle();

      if (error || !proctor) {
        return NextResponse.json(
          { error: "Proctor profile not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        user: {
          id: proctor.id,
          name: proctor.name,
          role: "proctor",
          phone: proctor.phone,
          qualification: proctor.qualification,
          imageUrl: proctor.image_url,
        },
      });
    }

    // 5. DONOR LOGIN
    if (role === "donor") {
      const { data: donorOrder, error } = await supabase
        .from("sponsor_orders")
        .select("*")
        .or(`email.eq.${cleanIdentifier},phone.eq.${identifier}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !donorOrder) {
        return NextResponse.json(
          { error: "Donor order not found for this email/phone." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        user: {
          id: donorOrder.id,
          name: donorOrder.name,
          role: "donor",
          email: donorOrder.email,
          phone: donorOrder.phone,
        },
      });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (err) {
    console.error("Error in login route:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
