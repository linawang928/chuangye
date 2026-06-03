import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { canViewEntry, getUserByHandle, insertComment } from "@/lib/db";
import type { Comment } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const viewer = getUserByHandle(handle);
  const body = (await request.json()) as Partial<Comment>;
  if (!body.entryId || !body.body) {
    return NextResponse.json({ error: "点评内容不完整" }, { status: 400 });
  }

  if (!canViewEntry(body.entryId, viewer.id)) {
    return NextResponse.json({ error: "没有权限点评这条记录" }, { status: 403 });
  }

  insertComment({
    entryId: body.entryId,
    authorId: viewer.id,
    intent: body.intent || "review",
    body: body.body
  });
  return NextResponse.json({ ok: true });
}
