import { NextResponse } from "next/server";
import { internalError, jsonError } from "@/lib/api/respond";
import { getPrisma } from "@/lib/prisma";
import { startSponsorshipCheckout } from "@/lib/sponsorship/checkout";
import { parseSponsorBody } from "@/lib/validation/sponsor";

export async function POST(request: Request) {
  try {
    const parsed = parseSponsorBody(await request.json());

    if (!parsed.success) {
      return jsonError(parsed.error, parsed.status);
    }

    const result = await startSponsorshipCheckout(getPrisma(), parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, unavailable: result.unavailable },
        { status: result.status },
      );
    }

    return NextResponse.json({
      orderId: result.orderId,
      paymentSessionId: result.paymentSessionId,
      amount: result.amount,
    });
  } catch (error) {
    return internalError(error, "Error in sponsor route");
  }
}
