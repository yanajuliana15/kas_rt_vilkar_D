import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { revokeSession } from "@/lib/session-log";

// DELETE /api/sessions/[id] - revoke session (superadmin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya superadmin." }, { status: 403 });
    }
    const { id } = await params;
    await revokeSession(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal revoke session", detail: String(e) },
      { status: 500 }
    );
  }
}
