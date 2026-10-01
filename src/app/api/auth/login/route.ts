import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyUser, AUTH_COOKIE, ensureDefaultUsers } from "@/lib/auth";
import { recordLogin } from "@/lib/session-log";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }
    // Pastikan user default ada (admin/superadmin)
    await ensureDefaultUsers();
    // Verifikasi user dari database
    const role = await verifyUser(username, password);
    if (!role) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }
    const token = createSession(role);
    // Catat login ke session log
    const sessionId = token.split(".")[0].slice(0, 16);
    try {
      await recordLogin(sessionId, role, req);
    } catch {}
    const res = NextResponse.json({ success: true, role, token, username });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal login", detail: String(e) },
      { status: 500 }
    );
  }
}
