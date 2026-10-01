import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// PUT /api/tagihan/[id] - update tagihan
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
    const { jenisTagihan, nominal, bulan, tahun, keterangan } = body;

    const existing = await db.tagihan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (existing.status === "lunas") {
      return NextResponse.json(
        { error: "Tagihan sudah lunas, tidak bisa diubah. Batalkan pembayaran dulu." },
        { status: 400 }
      );
    }

    const tagihan = await db.tagihan.update({
      where: { id },
      data: {
        jenisTagihan,
        nominal: nominal !== undefined ? Number(nominal) : undefined,
        bulan: bulan !== undefined ? Number(bulan) : undefined,
        tahun: tahun !== undefined ? Number(tahun) : undefined,
        keterangan: keterangan ?? null,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: tagihan });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/tagihan/[id]?action=bayar - tandai lunas (auto-create kas trx)
// POST /api/tagihan/[id]?action=batal - batal lunas (delete kas trx)
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const tagihan = await db.tagihan.findUnique({
      where: { id },
      include: { warga: { select: { namaLengkap: true } } },
    });
    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    if (action === "bayar") {
      if (tagihan.status === "lunas") {
        return NextResponse.json({ error: "Tagihan sudah lunas" }, { status: 400 });
      }
      const bulanNama = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
      ][tagihan.bulan - 1];
      const tanggal = `${tagihan.tahun}-${String(tagihan.bulan).padStart(2, "0")}-01`;

      // Create kas transaction & link
      const trx = await db.kasTransaction.create({
        data: {
          tanggal,
          jenis: "masuk",
          kategori: tagihan.jenisTagihan,
          jumlah: tagihan.nominal,
          keterangan: `${tagihan.jenisTagihan} ${bulanNama} ${tagihan.tahun} - ${tagihan.warga.namaLengkap}`,
          wargaId: tagihan.wargaId,
        },
      });
      const updated = await db.tagihan.update({
        where: { id },
        data: { status: "lunas", kasTrxId: trx.id },
        include: { warga: { select: { namaLengkap: true, nik: true } } },
      });
      return NextResponse.json({ data: updated, kasTrx: trx });
    }

    if (action === "batal") {
      if (tagihan.status !== "lunas") {
        return NextResponse.json({ error: "Tagihan belum lunas" }, { status: 400 });
      }
      if (tagihan.kasTrxId) {
        try {
          await db.kasTransaction.delete({ where: { id: tagihan.kasTrxId } });
        } catch {
          // ignore if already deleted
        }
      }
      const updated = await db.tagihan.update({
        where: { id },
        data: { status: "belum_bayar", kasTrxId: null },
        include: { warga: { select: { namaLengkap: true, nik: true } } },
      });
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Action tidak dikenal. Gunakan ?action=bayar atau ?action=batal" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal memproses aksi tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/tagihan/[id]
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
    const tagihan = await db.tagihan.findUnique({ where: { id } });
    if (!tagihan) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    // Jika sudah lunas, hapus juga transaksi kasnya
    if (tagihan.kasTrxId) {
      try {
        await db.kasTransaction.delete({ where: { id: tagihan.kasTrxId } });
      } catch {
        // ignore
      }
    }
    await db.tagihan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}
