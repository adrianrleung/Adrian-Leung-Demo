import { NextResponse } from "next/server";
import { runAction } from "@/platform/actions";
import { currentUser } from "@/platform/auth";
import { checkRateLimit } from "@/platform/rate-limit";
import { assertSameOrigin, requireVisibleApp } from "@/platform/server";
import { toResponse } from "@/platform/http";
import type { Row } from "@/platform/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ app: string; action: string }> },
) {
  try {
    const { app: slug, action } = await params;
    assertSameOrigin(request);
    const user = await currentUser();
    checkRateLimit(user.id);
    const app = requireVisibleApp(slug, user);
    const body = (await request.json()) as { rowId: string; input?: Row };

    await runAction(app, action, body.rowId, user, body.input ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
