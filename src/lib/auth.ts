import crypto from "crypto";
import type { NextRequest } from "next/server";
import type { UserHandle } from "@/lib/types";

export const SESSION_COOKIE = "startup_memory_session";

function secret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function passcodeFor(handle: UserHandle) {
  if (handle === "lin") {
    return process.env.LIN_PASSCODE || "lin123456";
  }

  return process.env.SHELLEY_PASSCODE || "shelley123456";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function isValidPasscode(handle: UserHandle, passcode: string) {
  const expected = Buffer.from(passcodeFor(handle));
  const received = Buffer.from(passcode || "");
  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

export function createSession(handle: UserHandle) {
  const payload = Buffer.from(
    JSON.stringify({ handle, createdAt: Date.now() }),
    "utf8"
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(token?: string): UserHandle | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.handle === "lin" || parsed.handle === "shelley") {
      return parsed.handle;
    }
  } catch {
    return null;
  }

  return null;
}

export function getViewerHandle(request: NextRequest) {
  return readSession(request.cookies.get(SESSION_COOKIE)?.value);
}
