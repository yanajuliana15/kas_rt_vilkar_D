import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// PUT /api/dokumentasi/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { judul, tipe, tanggal, deskripsi, targetDate, status, progress } = body;

    const existing = await db.dokumentasi.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Dokumentasi tidak ditemukan" }, { status: 404 });

    const doc = await db.dokumentasi.update({
      where: { id },
      data: {
        judul,
        tipe,
        tanggal,
        deskripsi,
        targetDate: targetDate ?? null,
        status: status ?? existing.status,
        progress:
          progress !== undefined
            ? Math.min(100, Math.max(0, Number(progress)))
            : undefined,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: doc });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah dokumentasi", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/dokumentasi/[id]
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
    const existing = await db.dokumentasi.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Dokumentasi tidak ditemukan" }, { status: 404 });

    await db.dokumentasi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus dokumentasi", detail: String(e) },
      { status: 500 }
    );
  }
}
