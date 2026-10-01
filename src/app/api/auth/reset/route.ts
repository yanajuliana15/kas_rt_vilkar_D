import { NextResponse } from "next/server";
import { ensureDefaultUsers } from "@/lib/auth";

// POST /api/auth/reset - reset default users (admin & superadmin)
// Recreate default users jika hilang, supaya bisa login recovery
export async function POST() {
  try {
    await ensureDefaultUsers();
    return NextResponse.json({
      success: true,
      message: "Akun default admin & superadmin telah dibuat ulang. Hubungi superadmin untuk kredensial.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal reset", detail: String(e) },
      { status: 500 }
    );
  }
}
