import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySession } from "@/lib/auth";
import { recordLogout } from "@/lib/session-log";

export async function POST(req: NextRequest) {
  // Ambil session id dari cookie untuk mark logout di log
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  const token = match?.[1];
  const session = verifySession(token);
  if (session?.sessionId) {
    try {
      await recordLogout(session.sessionId);
    } catch {}
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
