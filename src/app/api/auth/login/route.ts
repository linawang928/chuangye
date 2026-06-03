import { NextRequest, NextResponse } from "next/server";
import { createSession, isValidPasscode, SESSION_COOKIE } from "@/lib/auth";
import { getUserByHandle } from "@/lib/db";
import type { UserHandle } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { handle?: UserHandle; passcode?: string };
  const handle = body.handle;
  if ((handle !== "lin" && handle !== "shelley") || !body.passcode) {
    return NextResponse.json({ error: "登录信息不完整" }, { status: 400 });
  }

  if (!isValidPasscode(handle, body.passcode)) {
    return NextResponse.json({ error: "口令不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ viewer: getUserByHandle(handle) });
  response.cookies.set(SESSION_COOKIE, createSession(handle), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
