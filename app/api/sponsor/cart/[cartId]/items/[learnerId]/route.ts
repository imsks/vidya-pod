import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { removeCartItem } from "@/lib/sponsorship/cart";
import {
  cartNotFoundResponse,
  cartResponse,
  internalErrorResponse,
} from "@/lib/sponsorship/cart-http";
import { isValidUuid } from "@/lib/validation/sponsorship-cart";

type RouteContext = {
  params: Promise<{ cartId: string; learnerId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { cartId, learnerId } = await context.params;
    if (!isValidUuid(cartId)) {
      return cartNotFoundResponse();
    }

    if (!isValidUuid(learnerId)) {
      return NextResponse.json({ error: "Valid learner ID is required" }, { status: 400 });
    }

    return cartResponse(await removeCartItem(getPrisma(), cartId, learnerId));
  } catch (error) {
    return internalErrorResponse("Error removing learner from sponsorship cart", error);
  }
}
