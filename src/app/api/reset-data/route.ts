import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUsers } from "@/lib/auth";

// POST /api/reset-data - hapus SEMUA data kecuali akun superadmin
// Digunakan untuk clear data contoh / fresh start
export async function POST() {
  try {
    // 1. Hapus semua data transaksional (urutan penting karena relasi)
    await db.pembayaranPinjaman.deleteMany();
    await db.peminjaman.deleteMany();
    await db.tagihan.deleteMany();
    await db.berkas.deleteMany();
    await db.dokumentasi.deleteMany();
    await db.kasTransaction.deleteMany();
    await db.struktur.deleteMany();
    await db.warga.deleteMany();
    // Session log tidak dihapus (keep history login)

    // 2. Hapus SEMUA AdminUser KECUALI superadmin
    await db.adminUser.deleteMany({
      where: { role: { not: "superadmin" } },
    });

    // 3. Pastikan minimal ada 1 superadmin (ensureDefaultUsers tidak akan duplicate karena username unique)
    await ensureDefaultUsers();

    // 4. Reset settings (iuran amount, dll) - keep adminPassword/superadminPassword
    await db.setting.deleteMany({
      where: { key: { notIn: ["adminPassword", "superadminPassword"] } },
    });

    return NextResponse.json({
      success: true,
      message: "Semua data dihapus. Hanya akun superadmin yang tersisa. Login: superadmin/super123",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal reset data", detail: String(e) },
      { status: 500 }
    );
  }
}
