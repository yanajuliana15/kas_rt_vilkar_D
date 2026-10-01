import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole, createUser } from "@/lib/auth";

// GET /api/users - list all admin users (superadmin only)
export async function GET(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya superadmin." }, { status: 403 });
    }
    const users = await db.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, role: true, nama: true, aktif: true, createdAt: true },
    });
    return NextResponse.json({ data: users });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data users", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/users - create new user (superadmin only)
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya superadmin." }, { status: 403 });
    }
    const body = await req.json();
    const { username, password, role: newRole, nama } = body;
    if (!username || !password || !newRole || !nama) {
      return NextResponse.json({ error: "username, password, role, nama wajib diisi" }, { status: 400 });
    }
    if (newRole !== "admin" && newRole !== "superadmin") {
      return NextResponse.json({ error: "Role harus admin atau superadmin" }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Password minimal 4 karakter" }, { status: 400 });
    }
    // Cek duplikat username
    const existing = await db.adminUser.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 400 });
    }
    await createUser(username, password, newRole, nama);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal membuat user", detail: String(e) },
      { status: 500 }
    );
  }
}
