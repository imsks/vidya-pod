import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import {
  mapExpense,
  mapLearner,
  mapProctor,
  mapSponsor,
  mapSponsorOrder,
  mapTeacher,
} from "@/lib/admin/record-mappers";
import { internalError, jsonError } from "@/lib/api/respond";
import { getAdminDashboardRecords } from "@/lib/data/admin-dashboard";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!validateAdminSecret(getAdminSecretFromRequest(request))) {
    return jsonError("Unauthorized: Invalid admin PIN", 401);
  }

  try {
    const records = await getAdminDashboardRecords(getPrisma());

    return NextResponse.json({
      teachers: records.teachers.map(mapTeacher),
      learners: records.learners.map(mapLearner),
      proctors: records.proctors.map(mapProctor),
      sponsors: records.sponsors.map(mapSponsor),
      sponsor_orders: records.sponsorOrders.map(mapSponsorOrder),
      expenses: records.expenses.map(mapExpense),
    });
  } catch (error) {
    return internalError(error, "Error in admin route");
  }
}
