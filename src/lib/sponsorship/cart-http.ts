import { NextResponse } from "next/server";
import { CART_NOT_FOUND_MESSAGE, type CartServiceError, type CartServiceResult } from "./cart";
import type { CartResponse } from "./cart-types";

type JsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/** An empty body is allowed (it parses to `undefined`); malformed JSON is a 400. */
export const readJsonBody = async (request: Request): Promise<JsonBodyResult> => {
  const text = await request.text();

  if (!text.trim()) {
    return { ok: true, body: undefined };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }),
    };
  }
};

export const cartErrorResponse = (error: CartServiceError) =>
  NextResponse.json(
    { error: error.error, ...(error.unavailable ? { unavailable: error.unavailable } : {}) },
    { status: error.status },
  );

export const cartResponse = (result: CartServiceResult<CartResponse>, successStatus = 200) =>
  result.ok
    ? NextResponse.json({ success: true, data: result.data }, { status: successStatus })
    : cartErrorResponse(result);

export const cartNotFoundResponse = () =>
  NextResponse.json({ error: CART_NOT_FOUND_MESSAGE }, { status: 404 });

export const internalErrorResponse = (label: string, error: unknown) => {
  console.error(`${label}:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
};
