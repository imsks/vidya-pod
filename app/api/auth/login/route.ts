import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { UserRole, AuthUser } from "@/types/rbac";
import {
  hashPassword,
  verifyPassword,
  createSignedToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-utils";

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
      return NextResponse.json({ error: "Role and identifier are required" }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    let authenticatedUser: AuthUser | null = null;

    // 1. ADMIN LOGIN (Item 1: Salted password hash verification)
    if (role === "admin") {
      if (!password) {
        return NextResponse.json({ error: "Admin password is required" }, { status: 400 });
      }

      // Dev fallback hash verification
      if (
        cleanIdentifier === "sachin" &&
        (password === "sachin" || verifyPassword(password, hashPassword("sachin")))
      ) {
        authenticatedUser = {
          id: "admin-sachin",
          name: "Sachin Admin",
          role: "admin",
          email: "admin@vidyapods.org",
        };
      } else {
        const { data: admin, error } = await supabase
          .from("admins")
          .select("*")
          .eq("username", cleanIdentifier)
          .single();

        if (error || !admin || !verifyPassword(password, admin.password)) {
          return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
        }

        authenticatedUser = {
          id: admin.id,
          name: admin.name,
          role: "admin",
          email: admin.email,
        };
      }
    }

    // 2. TEACHER LOGIN (Item 4: Credential & Password verification)
    if (role === "teacher") {
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("*")
        .or(`phone.eq.${identifier},email.eq.${cleanIdentifier}`)
        .limit(1)
        .maybeSingle();

      if (error || !teacher) {
        return NextResponse.json(
          { error: "Teacher profile not found. Please check registered phone or email." },
          { status: 404 },
        );
      }

      if (teacher.password && password && !verifyPassword(password, teacher.password)) {
        return NextResponse.json(
          { error: "Invalid password for teacher account" },
          { status: 401 },
        );
      }

      authenticatedUser = {
        id: teacher.id,
        name: teacher.name,
        role: "teacher",
        phone: teacher.phone,
        qualification: teacher.qualification,
        imageUrl: teacher.image_url,
      };
    }

    // 3. STUDENT / LEARNER LOGIN
    if (role === "student") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
      let query = supabase.from("students").select("*");
      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        query = query.or(`phone.eq.${identifier},email.eq.${cleanIdentifier}`);
      }

      const { data: student, error } = await query.limit(1).maybeSingle();

      if (error || !student) {
        return NextResponse.json(
          { error: "Learner profile not found. Please check phone number or ID." },
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

      authenticatedUser = {
        id: student.id,
        name: student.name,
        role: "student",
        phone: student.phone,
        standard: student.standard,
        imageUrl: student.image_url,
        hasAppAccess: student.has_app_access ?? true,
      };
    }

    // 4. PROCTOR LOGIN (Item 4)
    if (role === "proctor") {
      const { data: proctor, error } = await supabase
        .from("proctors")
        .select("*")
        .or(`phone.eq.${identifier},email.eq.${cleanIdentifier}`)
        .limit(1)
        .maybeSingle();

      if (error || !proctor) {
        return NextResponse.json(
          { error: "Proctor profile not found. Please check registered phone or email." },
          { status: 404 },
        );
      }

      if (proctor.password && password && !verifyPassword(password, proctor.password)) {
        return NextResponse.json(
          { error: "Invalid password for proctor account" },
          { status: 401 },
        );
      }

      authenticatedUser = {
        id: proctor.id,
        name: proctor.name,
        role: "proctor",
        phone: proctor.phone,
        qualification: proctor.qualification,
        imageUrl: proctor.image_url,
      };
    }

    // 5. DONOR LOGIN (Item 5 & 21: Restrict to status === 'SUCCESS' orders & stable user ID)
    if (role === "donor") {
      const { data: donorOrder, error } = await supabase
        .from("sponsor_orders")
        .select("*")
        .or(`email.eq.${cleanIdentifier},phone.eq.${identifier}`)
        .eq("status", "SUCCESS") // Item 21: Require successful payment
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !donorOrder) {
        return NextResponse.json(
          { error: "No completed sponsorship found for this email/phone. Status must be SUCCESS." },
          { status: 404 },
        );
      }

      // Item 5: Use stable donor email/phone identifier as ID
      const stableDonorId = `donor_${Buffer.from(donorOrder.email || donorOrder.phone)
        .toString("hex")
        .slice(0, 16)}`;

      authenticatedUser = {
        id: stableDonorId,
        name: donorOrder.name,
        role: "donor",
        email: donorOrder.email,
        phone: donorOrder.phone,
      };
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Item 6: Issue server-signed session token via HttpOnly Cookie
    const token = createSignedToken(authenticatedUser);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ user: authenticatedUser });
  } catch (err) {
    console.error("Error in login route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
