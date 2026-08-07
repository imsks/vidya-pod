import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Proctor, Student, Teacher } from "@/lib/models";

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { role, name, phone, qualification, standard, image_url } = body;

    if (!role || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["teacher", "student", "proctor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "student") {
      if (!standard) {
        return NextResponse.json(
          { error: "Standard is required for students" },
          { status: 400 },
        );
      }

      await Student.create({ name, phone, standard, image_url });
    } else {
      if (!qualification) {
        return NextResponse.json(
          { error: "Qualification is required" },
          { status: 400 },
        );
      }

      const Model = role === "teacher" ? Teacher : Proctor;
      await Model.create({ name, phone, qualification, image_url });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in register route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
