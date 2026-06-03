import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { getUserByHandle, insertGraphNode } from "@/lib/db";
import type { KnowledgeNode, Visibility } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const viewer = getUserByHandle(handle);
  const body = (await request.json()) as Partial<KnowledgeNode>;
  if (!body.label || !body.type) {
    return NextResponse.json({ error: "节点名称和类型不能为空" }, { status: 400 });
  }

  insertGraphNode({
    ownerId: viewer.id,
    visibility: (body.visibility || "private") as Visibility,
    projectId: body.projectId || null,
    type: body.type,
    label: body.label,
    description: body.description || ""
  });

  return NextResponse.json({ ok: true });
}
