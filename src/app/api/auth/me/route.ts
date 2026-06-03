import { NextRequest, NextResponse } from "next/server";
import { getViewerHandle } from "@/lib/auth";
import { getUserByHandle } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ viewer: null }, { status: 401 });
  }

  return NextResponse.json({ viewer: getUserByHandle(handle) });
}
