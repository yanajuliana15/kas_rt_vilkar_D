import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";
import { getRole } from "@/lib/auth";

// DELETE /api/berkas/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const { id } = await params;
    const berkas = await db.berkas.findUnique({ where: { id } });
    if (!berkas)
      return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });

    // hapus file fisik
    try {
      const filePath = path.join(process.cwd(), "public", berkas.filePath);
      await unlink(filePath);
    } catch {
      // ignore if file already gone
    }

    await db.berkas.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus berkas", detail: String(e) },
      { status: 500 }
    );
  }
}
