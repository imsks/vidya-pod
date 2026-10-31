import { NextResponse } from "next/server";

export const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

/** Logs the real cause server-side and returns a generic body so internals never reach the client. */
export const internalError = (
  error: unknown,
  context: string,
  message = "Internal server error",
) => {
  console.error(`${context}:`, error);
  return NextResponse.json({ error: message }, { status: 500 });
};
