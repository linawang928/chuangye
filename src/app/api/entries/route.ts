import { NextRequest, NextResponse } from "next/server";
import { analyzeEntry } from "@/lib/ai";
import { getViewerHandle } from "@/lib/auth";
import { getUserByHandle, insertEntry } from "@/lib/db";
import type { Entry, Visibility } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const viewer = getUserByHandle(handle);
  const body = (await request.json()) as Partial<Entry> & {
    tags?: string[];
    assetNames?: string[];
  };
  if (!body.title || !body.body) {
    return NextResponse.json({ error: "标题和正文不能为空" }, { status: 400 });
  }

  const analysis = await analyzeEntry({
    title: body.title,
    body: body.body,
    tags: body.tags || [],
    sourceType: body.sourceType || "text"
  });
  const entryId = insertEntry({
    ownerId: viewer.id,
    visibility: (body.visibility || "private") as Visibility,
    projectId: body.projectId || null,
    title: body.title,
    body: body.body,
    sourceType: body.sourceType || "text",
    mood: body.mood || "steady",
    confidence: Number(body.confidence || 70),
    importance: Number(body.importance || 3),
    tags: analysis.tags,
    aiSummary: analysis.summary,
    assetNames: body.assetNames || [],
    analysisNodes: analysis.nodes
  });

  return NextResponse.json({ ok: true, id: entryId });
}
