import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createCart } from "@/lib/sponsorship/cart";
import { cartResponse, internalErrorResponse, readJsonBody } from "@/lib/sponsorship/cart-http";
import { parseCreateCartBody } from "@/lib/validation/sponsorship-cart";

export async function POST(request: Request) {
  try {
    const read = await readJsonBody(request);
    if (!read.ok) {
      return read.response;
    }

    const parsed = parseCreateCartBody(read.body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    return cartResponse(await createCart(getPrisma(), parsed.data), 201);
  } catch (error) {
    return internalErrorResponse("Error creating sponsorship cart", error);
  }
}
