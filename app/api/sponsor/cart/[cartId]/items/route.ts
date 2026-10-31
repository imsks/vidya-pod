import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { addCartItem } from "@/lib/sponsorship/cart";
import {
  cartNotFoundResponse,
  cartResponse,
  internalErrorResponse,
  readJsonBody,
} from "@/lib/sponsorship/cart-http";
import { isValidUuid, parseCartItemBody } from "@/lib/validation/sponsorship-cart";

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

    const parsed = parseCartItemBody(read.body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    return cartResponse(await addCartItem(getPrisma(), cartId, parsed.data.learner_id), 201);
  } catch (error) {
    return internalErrorResponse("Error adding learner to sponsorship cart", error);
  }
}
