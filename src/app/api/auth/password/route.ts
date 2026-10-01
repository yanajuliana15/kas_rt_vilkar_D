import { NextRequest, NextResponse } from "next/server";
import { getRole, setPassword } from "@/lib/auth";

// PUT /api/auth/password - change password (admin/superadmin only)
// body: { role, newPassword, currentPassword }
export async function PUT(req: NextRequest) {
  try {
    const currentRole = await getRole(req);
    if (currentRole === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login dulu." }, { status: 403 });
    }
    const { role, newPassword, currentPassword } = await req.json();
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }
    // Superadmin bisa ganti password admin & superadmin
    // Admin hanya bisa ganti password admin sendiri
    if (role === "superadmin" && currentRole !== "superadmin") {
      return NextResponse.json({ error: "Hanya superadmin yang bisa ganti password superadmin" }, { status: 403 });
    }
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "Password baru minimal 4 karakter" }, { status: 400 });
    }
    // Verifikasi password saat ini
    const { verifyPassword } = await import("@/lib/auth");
    if (currentPassword && !(await verifyPassword(role, currentPassword))) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 401 });
    }
    await setPassword(role, newPassword);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah password", detail: String(e) },
      { status: 500 }
    );
  }
}
