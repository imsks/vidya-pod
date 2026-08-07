import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  Proctor,
  SponsorOrder,
  Student,
  Teacher,
} from "@/lib/models";
import { serializeDocuments } from "@/lib/serialize";

export async function GET() {
  try {
    await connectDB();

    const [teachers, students, proctors, sponsors] = await Promise.all([
      Teacher.find().sort({ created_at: -1 }).lean(),
      Student.find().sort({ created_at: -1 }).lean(),
      Proctor.find().sort({ created_at: -1 }).lean(),
      SponsorOrder.find().sort({ created_at: -1 }).lean(),
    ]);

    return NextResponse.json({
      teachers: serializeDocuments(teachers),
      students: serializeDocuments(students),
      proctors: serializeDocuments(proctors),
      sponsors: serializeDocuments(sponsors),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
