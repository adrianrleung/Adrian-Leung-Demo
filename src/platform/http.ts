import { NextResponse } from "next/server";
import { HttpError } from "./server";

/**
 * Shared error serialisation for the generic API routes. It lives here rather
 * than in a route module because Next's generated route types reject any
 * export from `route.ts` that is not a route handler.
 */
export function toResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
