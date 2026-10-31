import { NextResponse } from "next/server";
import { getAdminSecretFromRequest, validateAdminSecret } from "@/lib/admin-auth";
import { mapExpense } from "@/lib/admin/record-mappers";
import { internalError, jsonError } from "@/lib/api/respond";
import { createExpense, listExpenses } from "@/lib/data/expense";
import { getPrisma } from "@/lib/prisma";
import { parseExpenseBody } from "@/lib/validation/expense";

const isAuthorized = (request: Request) => validateAdminSecret(getAdminSecretFromRequest(request));

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized: Invalid admin PIN", 401);
  }

  try {
    const expenses = await listExpenses(getPrisma());
    return NextResponse.json({ expenses: expenses.map(mapExpense) });
  } catch (error) {
    return internalError(error, "Error loading admin expenses", "Unable to load expenses");
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Unauthorized: Invalid admin PIN", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    const parsed = parseExpenseBody(body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    const expense = await createExpense(getPrisma(), {
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description,
      incurredAt: new Date(`${parsed.data.incurred_at}T00:00:00.000Z`),
    });

    return NextResponse.json({ expense: mapExpense(expense) }, { status: 201 });
  } catch (error) {
    return internalError(error, "Error creating admin expense", "Unable to save expense");
  }
}
