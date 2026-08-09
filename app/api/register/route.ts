import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { parseRegisterBody } from "@/lib/validation/register";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseRegisterBody(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { role, name, phone, image_url } = parsed.data;
    const imageUrl = image_url || null;

    const prisma = getPrisma();
    if (role === "student") {
      await prisma.student.create({
        data: {
          name,
          phone,
          standard: parsed.data.standard,
          imageUrl,
        },
      });
    } else if (role === "teacher") {
      await prisma.teacher.create({
        data: {
          name,
          phone,
          qualification: parsed.data.qualification,
          imageUrl,
        },
      });
    } else {
      await prisma.proctor.create({
        data: {
          name,
          phone,
          qualification: parsed.data.qualification,
          imageUrl,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in register route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
