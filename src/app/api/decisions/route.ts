import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { getUserByHandle, insertDecision } from "@/lib/db";
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
    projectId?: string | null;
    title?: string;
    context?: string;
    options?: string[];
    decision?: string;
    reasoning?: string;
    confidence?: number;
    expectedOutcome?: string;
    reviewDate?: string;
  };

  if (!body.title || !body.context || !body.decision) {
    return NextResponse.json({ error: "决策标题、背景和决定不能为空" }, { status: 400 });
  }

  insertDecision({
    ownerId: viewer.id,
    visibility: body.visibility || "private",
    projectId: body.projectId || null,
    title: body.title,
    context: body.context,
    options: body.options || [],
    decision: body.decision,
    reasoning: body.reasoning || "",
    confidence: Number(body.confidence || 70),
    expectedOutcome: body.expectedOutcome || "",
    reviewDate: body.reviewDate || ""
  });

  return NextResponse.json({ ok: true });
}
