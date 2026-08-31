import { NextResponse } from "next/server";
import { currentUser } from "@/platform/auth";
import {
  HttpError,
  applyFieldVisibility,
  parseQuery,
  requireVisibleApp,
} from "@/platform/server";

/**
 * The entire list API for every app in the platform. Adding a tool adds no
 * routes, so the security-relevant code path is tested once.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ app: string }> },
) {
  try {
    const { app: slug } = await params;
    const user = await currentUser();
    const app = requireVisibleApp(slug, user);
    const query = parseQuery(app, new URL(request.url).searchParams);
    const page = await app.source.list(query);

    return NextResponse.json({
      rows: page.rows.map((row) => applyFieldVisibility(app, user, row)),
      total: page.total,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return toResponse(error);
  }
}

export function toResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
