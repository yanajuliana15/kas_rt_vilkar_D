import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// PUT /api/peminjaman/[id] - update loan (only if no payments yet)
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
    const { jumlah, bunga, tanggalPinjam, tanggalJatuhTempo, keterangan, status } = body;

    const existing = await db.peminjaman.findUnique({
      where: { id },
      include: { pembayaran: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    }
    if (existing.pembayaran.length > 0) {
      return NextResponse.json(
        { error: "Tidak bisa diubah, sudah ada pembayaran. Hapus pembayaran dulu." },
        { status: 400 }
      );
    }

    const updated = await db.peminjaman.update({
      where: { id },
      data: {
        jumlah: jumlah !== undefined ? Number(jumlah) : undefined,
        bunga: bunga !== undefined ? Number(bunga) : undefined,
        tanggalPinjam,
        tanggalJatuhTempo,
        keterangan: keterangan ?? null,
        status: status ?? undefined,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah peminjaman", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/peminjaman/[id] - delete loan + related kas trx & payments
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
    const existing = await db.peminjaman.findUnique({
      where: { id },
      include: { pembayaran: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    }
    // Hapus transaksi kas terkait
    const trxIds = [existing.kasTrxIdPencairan, ...existing.pembayaran.map((p) => p.kasTrxId)].filter(Boolean) as string[];
    for (const trxId of trxIds) {
      try {
        await db.kasTransaction.delete({ where: { id: trxId } });
      } catch {
        // ignore
      }
    }
    await db.peminjaman.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus peminjaman", detail: String(e) },
      { status: 500 }
    );
  }
}
