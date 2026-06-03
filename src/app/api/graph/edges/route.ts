import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { getUserByHandle, insertGraphEdge } from "@/lib/db";
import type { Visibility } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const viewer = getUserByHandle(handle);
  const body = (await request.json()) as {
    visibility?: Visibility;
    sourceNodeId?: string;
    targetNodeId?: string;
    relation?: string;
  };
  if (!body.sourceNodeId || !body.targetNodeId || !body.relation) {
    return NextResponse.json({ error: "关系信息不完整" }, { status: 400 });
  }

  insertGraphEdge({
    ownerId: viewer.id,
    visibility: body.visibility || "private",
    sourceNodeId: body.sourceNodeId,
    targetNodeId: body.targetNodeId,
    relation: body.relation
  });

  return NextResponse.json({ ok: true });
}
