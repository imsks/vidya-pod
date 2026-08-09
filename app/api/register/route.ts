import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getRegisterTable, parseRegisterBody } from "@/lib/validation/register";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseRegisterBody(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const supabase = getSupabase();
    const { role, name, phone, image_url } = parsed.data;

    let result;
    if (role === "student") {
      result = await supabase.from("students").insert({
        name,
        phone,
        standard: parsed.data.standard,
        image_url: image_url || null,
      });
    } else {
      const table = getRegisterTable(role);
      result = await supabase.from(table).insert({
        name,
        phone,
        qualification: parsed.data.qualification,
        image_url: image_url || null,
      });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in register route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
