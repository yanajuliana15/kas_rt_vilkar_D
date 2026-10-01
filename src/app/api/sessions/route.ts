import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getActiveSessions, getAllSessions } from "@/lib/session-log";

// GET /api/sessions?mode=active|all (default active)
// Superadmin only
export async function GET(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya superadmin." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "active";
    const sessions = mode === "all" ? await getAllSessions() : await getActiveSessions();
    return NextResponse.json({ data: sessions });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data session", detail: String(e) },
      { status: 500 }
    );
  }
}
