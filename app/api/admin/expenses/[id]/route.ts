import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { internalError, jsonError } from "@/lib/api/respond";
import { deleteExpense } from "@/lib/data/expense";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: RouteContext) {
  if (!validateAdminSecret(getAdminSecretFromRequest(request))) {
    return jsonError("Unauthorized: Invalid admin PIN", 401);
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return jsonError("Invalid expense id", 400);
  }

  try {
    const deleted = await deleteExpense(getPrisma(), id);
    if (!deleted) {
      return jsonError("Expense not found", 404);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError(error, "Error deleting admin expense", "Unable to delete expense");
  }
}
