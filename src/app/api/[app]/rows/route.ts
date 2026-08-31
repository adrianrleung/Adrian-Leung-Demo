import { NextResponse } from "next/server";
import { currentUser } from "@/platform/auth";
import { createRow } from "@/platform/create";
import { toResponse } from "@/platform/http";
import { checkRateLimit } from "@/platform/rate-limit";
import {
  applyFieldVisibility,
  assertSameOrigin,
  parseQuery,
  requireVisibleApp,
  rowAccessFilters,
} from "@/platform/server";
import type { Row } from "@/platform/types";

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
    query.filters.push(...rowAccessFilters(app, user));
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

/** Generic submission endpoint for apps that declare `create`. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ app: string }> },
) {
  try {
    const { app: slug } = await params;
    assertSameOrigin(request);
    const user = await currentUser();
    checkRateLimit(user.id);
    const app = requireVisibleApp(slug, user);
    const input = (await request.json()) as Row;

    const created = await createRow(app, user, input);
    return NextResponse.json(
      { row: applyFieldVisibility(app, user, created) },
      { status: 201 },
    );
  } catch (error) {
    return toResponse(error);
  }
}
