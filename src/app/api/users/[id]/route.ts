import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole, updateUser, deleteUser } from "@/lib/auth";

// PUT /api/users/[id] - update user (superadmin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya superadmin." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { password, role: newRole, nama, aktif } = body;
    const existing = await db.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    // Cegah superadmin menonaktifkan/menghapus diri sendiri (harus ada minimal 1 superadmin aktif)
    if (existing.role === "superadmin" && (aktif === false || newRole === "admin")) {
      const activeSuperadmins = await db.adminUser.count({ where: { role: "superadmin", aktif: true } });
      if (activeSuperadmins <= 1) {
        return NextResponse.json({ error: "Tidak bisa mengubah superadmin terakhir. Minimal harus ada 1 superadmin aktif." }, { status: 400 });
      }
    }
    await updateUser(id, {
      password: password || undefined,
      role: newRole,
      nama,
      aktif,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah user", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - delete user (superadmin only)
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
    const existing = await db.adminUser.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    // Cegah hapus superadmin terakhir
    if (existing.role === "superadmin") {
      const activeSuperadmins = await db.adminUser.count({ where: { role: "superadmin", aktif: true } });
      if (activeSuperadmins <= 1) {
        return NextResponse.json({ error: "Tidak bisa menghapus superadmin terakhir." }, { status: 400 });
      }
    }
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus user", detail: String(e) },
      { status: 500 }
    );
  }
}
