import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { startCartCheckout } from "@/lib/sponsorship/cart-checkout";
import {
  cartErrorResponse,
  cartNotFoundResponse,
  internalErrorResponse,
  readJsonBody,
} from "@/lib/sponsorship/cart-http";
import { isValidUuid, parseCartCheckoutBody } from "@/lib/validation/sponsorship-cart";

type RouteContext = {
  params: Promise<{ cartId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { cartId } = await context.params;
    if (!isValidUuid(cartId)) {
      return cartNotFoundResponse();
    }

    const read = await readJsonBody(request);
    if (!read.ok) {
      return read.response;
    }

    const parsed = parseCartCheckoutBody(read.body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await startCartCheckout(getPrisma(), cartId, parsed.data);

    return result.ok ? NextResponse.json(result.data) : cartErrorResponse(result);
  } catch (error) {
    return internalErrorResponse("Error starting sponsorship cart checkout", error);
  }
}
