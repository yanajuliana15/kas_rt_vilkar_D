import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// POST /api/peminjaman/[id]/bayar - tambah pembayaran angsuran
// body: { tanggal, jumlah, keterangan }
export async function POST(
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
    const { tanggal, jumlah, keterangan } = body;

    if (!tanggal || !jumlah || Number(jumlah) <= 0) {
      return NextResponse.json({ error: "tanggal dan jumlah wajib diisi" }, { status: 400 });
    }

    const peminjaman = await db.peminjaman.findUnique({
      where: { id },
      include: { warga: { select: { namaLengkap: true } } },
    });
    if (!peminjaman) {
      return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    }

    // Create kas trx masuk (pembayaran pinjaman)
    const trx = await db.kasTransaction.create({
      data: {
        tanggal,
        jenis: "masuk",
        kategori: "Pengembalian Pinjaman",
        jumlah: Number(jumlah),
        keterangan: `Pembayaran pinjaman - ${peminjaman.warga.namaLengkap}`,
        wargaId: peminjaman.wargaId,
      },
    });

    // Create pembayaran record
    const pembayaran = await db.pembayaranPinjaman.create({
      data: {
        peminjamanId: id,
        tanggal,
        jumlah: Number(jumlah),
        keterangan: keterangan || null,
        kasTrxId: trx.id,
      },
    });

    // Update totalBayar & status
    const newTotal = peminjaman.totalBayar + Number(jumlah);
    const totalHarus = peminjaman.jumlah + peminjaman.bunga;
    const newStatus = newTotal >= totalHarus ? "lunas" : peminjaman.status;

    const updated = await db.peminjaman.update({
      where: { id },
      data: { totalBayar: newTotal, status: newStatus },
      include: {
        warga: { select: { namaLengkap: true, nik: true } },
        pembayaran: { orderBy: { tanggal: "desc" } },
      },
    });

    return NextResponse.json({ data: updated, pembayaran }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah pembayaran", detail: String(e) },
      { status: 500 }
    );
  }
}
