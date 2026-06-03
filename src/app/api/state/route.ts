import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { readAppState } from "@/lib/db";
import type { DataScope } from "@/lib/types";

export const runtime = "nodejs";

const scopes = new Set(["all", "mine", "shared", "partner"]);

export async function GET(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const scopeParam = request.nextUrl.searchParams.get("scope") || "all";
  const scope = scopes.has(scopeParam) ? (scopeParam as DataScope) : "all";
  return NextResponse.json(readAppState(handle, scope));
}
