import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/peminjaman?status=&wargaId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const wargaId = searchParams.get("wargaId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (wargaId) where.wargaId = wargaId;

    const list = await db.peminjaman.findMany({
      where,
      orderBy: { tanggalPinjam: "desc" },
      include: {
        warga: { select: { id: true, namaLengkap: true, nik: true, noRumah: true } },
        pembayaran: { orderBy: { tanggal: "desc" } },
      },
    });

    const totalDipinjam = list.reduce((a, b) => a + b.jumlah, 0);
    const totalBunga = list.reduce((a, b) => a + b.bunga, 0);
    const totalBayar = list.reduce((a, b) => a + b.totalBayar, 0);
    const aktif = list.filter((p) => p.status === "aktif");
    const lunas = list.filter((p) => p.status === "lunas");
    const sisaTagihan = list.reduce((a, b) => a + Math.max(0, b.jumlah + b.bunga - b.totalBayar), 0);

    return NextResponse.json({
      data: list,
      stats: {
        total: list.length,
        aktif: aktif.length,
        lunas: lunas.length,
        totalDipinjam,
        totalBunga,
        totalBayar,
        sisaTagihan,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data peminjaman", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/peminjaman - create loan + auto-create kas trx "keluar" (pencairan)
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const body = await req.json();
    const { wargaId, jumlah, bunga, tanggalPinjam, tanggalJatuhTempo, keterangan, cairkan } = body;

    if (!wargaId || !jumlah || !tanggalPinjam || !tanggalJatuhTempo) {
      return NextResponse.json(
        { error: "wargaId, jumlah, tanggalPinjam, tanggalJatuhTempo wajib diisi" },
        { status: 400 }
      );
    }
    if (Number(jumlah) <= 0) {
      return NextResponse.json({ error: "Jumlah harus > 0" }, { status: 400 });
    }

    const warga = await db.warga.findUnique({ where: { id: wargaId } });
    if (!warga) {
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    }

    let kasTrxIdPencairan: string | null = null;
    if (cairkan !== false) {
      // Auto-create kas trx keluar (pencairan pinjaman)
      const trx = await db.kasTransaction.create({
        data: {
          tanggal: tanggalPinjam,
          jenis: "keluar",
          kategori: "Peminjaman",
          jumlah: Number(jumlah),
          keterangan: `Pencairan pinjaman - ${warga.namaLengkap}`,
          wargaId,
        },
      });
      kasTrxIdPencairan = trx.id;
    }

    const peminjaman = await db.peminjaman.create({
      data: {
        wargaId,
        jumlah: Number(jumlah),
        bunga: Number(bunga) || 0,
        tanggalPinjam,
        tanggalJatuhTempo,
        keterangan: keterangan || null,
        kasTrxIdPencairan,
      },
      include: {
        warga: { select: { namaLengkap: true, nik: true } },
        pembayaran: true,
      },
    });
    return NextResponse.json({ data: peminjaman }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah peminjaman", detail: String(e) },
      { status: 500 }
    );
  }
}
