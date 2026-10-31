import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCart, updateCart } from "@/lib/sponsorship/cart";
import {
  cartNotFoundResponse,
  cartResponse,
  internalErrorResponse,
  readJsonBody,
} from "@/lib/sponsorship/cart-http";
import { isValidUuid, parseUpdateCartBody } from "@/lib/validation/sponsorship-cart";

type RouteContext = {
  params: Promise<{ cartId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { cartId } = await context.params;
    if (!isValidUuid(cartId)) {
      return cartNotFoundResponse();
    }

    return cartResponse(await getCart(getPrisma(), cartId));
  } catch (error) {
    return internalErrorResponse("Error fetching sponsorship cart", error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { cartId } = await context.params;
    if (!isValidUuid(cartId)) {
      return cartNotFoundResponse();
    }

    const read = await readJsonBody(request);
    if (!read.ok) {
      return read.response;
    }

    const parsed = parseUpdateCartBody(read.body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    return cartResponse(await updateCart(getPrisma(), cartId, parsed.data));
  } catch (error) {
    return internalErrorResponse("Error updating sponsorship cart", error);
  }
}
