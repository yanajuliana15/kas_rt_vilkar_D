import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// PUT /api/kas/[id]
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
    const { tanggal, jenis, kategori, jumlah, keterangan, buktiUrl, wargaId } = body;

    const existing = await db.kasTransaction.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    if (jenis && jenis !== "masuk" && jenis !== "keluar") {
      return NextResponse.json({ error: "Jenis harus 'masuk' atau 'keluar'" }, { status: 400 });
    }

    const trx = await db.kasTransaction.update({
      where: { id },
      data: {
        tanggal,
        jenis,
        kategori,
        jumlah: jumlah !== undefined ? Number(jumlah) : undefined,
        keterangan: keterangan ?? null,
        buktiUrl: buktiUrl ?? null,
        wargaId: wargaId || null,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: trx });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah transaksi", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/kas/[id]
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
    const existing = await db.kasTransaction.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    await db.kasTransaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus transaksi", detail: String(e) },
      { status: 500 }
    );
  }
}
