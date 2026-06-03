import { NextRequest, NextResponse } from "next/server";
import { answerWithAgent } from "@/lib/ai";
import { getViewerHandle } from "@/lib/auth";
import { readAppState } from "@/lib/db";
import type { DataScope } from "@/lib/types";

export const runtime = "nodejs";

const scopes = new Set(["all", "mine", "shared", "partner"]);

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await request.json()) as { question?: string; scope?: DataScope };
  if (!body.question) {
    return NextResponse.json({ error: "问题不能为空" }, { status: 400 });
  }

  const scope = body.scope && scopes.has(body.scope) ? body.scope : "all";
  const state = readAppState(handle, scope);
  return NextResponse.json(await answerWithAgent({ question: body.question, state }));
}
