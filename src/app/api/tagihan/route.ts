import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/tagihan?year=&month=&jenis=&status=&wargaId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const jenis = searchParams.get("jenis");
    const status = searchParams.get("status");
    const wargaId = searchParams.get("wargaId");

    const where: Record<string, unknown> = {};
    if (year) where.tahun = Number(year);
    if (month) where.bulan = Number(month);
    if (jenis) where.jenisTagihan = jenis;
    if (status) where.status = status;
    if (wargaId) where.wargaId = wargaId;

    const tagihan = await db.tagihan.findMany({
      where,
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { createdAt: "desc" }],
      include: { warga: { select: { id: true, namaLengkap: true, nik: true, alias: true, noRumah: true, kepalaKeluarga: true, status: true } } },
    });

    // Statistik
    const totalTagihan = tagihan.length;
    const totalNominal = tagihan.reduce((a, b) => a + b.nominal, 0);
    const lunas = tagihan.filter((t) => t.status === "lunas");
    const belumBayar = tagihan.filter((t) => t.status === "belum_bayar");
    const totalLunas = lunas.reduce((a, b) => a + b.nominal, 0);
    const totalBelum = belumBayar.reduce((a, b) => a + b.nominal, 0);

    // Breakdown per jenis
    const jenisMap = new Map<string, { count: number; nominal: number; lunas: number; belum: number }>();
    tagihan.forEach((t) => {
      const j = t.jenisTagihan;
      if (!jenisMap.has(j))
        jenisMap.set(j, { count: 0, nominal: 0, lunas: 0, belum: 0 });
      const e = jenisMap.get(j)!;
      e.count++;
      e.nominal += t.nominal;
      if (t.status === "lunas") e.lunas += t.nominal;
      else e.belum += t.nominal;
    });
    const perJenis = Array.from(jenisMap.entries()).map(([jenis, v]) => ({
      jenis,
      ...v,
    }));

    return NextResponse.json({
      data: tagihan,
      stats: {
        totalTagihan,
        totalNominal,
        lunasCount: lunas.length,
        belumBayarCount: belumBayar.length,
        totalLunas,
        totalBelum,
        perJenis,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/tagihan - create single tagihan
// POST /api/tagihan?bulk=true - generate bulk untuk semua warga aktif
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const bulk = searchParams.get("bulk") === "true";
    const body = await req.json();

    if (bulk) {
      // Generate massal
      const { jenisTagihan, nominal, bulan, tahun, keterangan, onlyActive = true, status = "belum_bayar", tanggalBayar } = body;
      if (!jenisTagihan || !nominal || !bulan || !tahun) {
        return NextResponse.json(
          { error: "jenisTagihan, nominal, bulan, tahun wajib diisi" },
          { status: 400 }
        );
      }
      const finalStatus = status === "lunas" ? "lunas" : "belum_bayar";
      const wargaList = await db.warga.findMany({
        where: onlyActive ? { status: "aktif" } : undefined,
        select: { id: true, namaLengkap: true },
      });
      // Cek duplikat
      const existing = await db.tagihan.findMany({
        where: { jenisTagihan, bulan: Number(bulan), tahun: Number(tahun) },
        select: { wargaId: true },
      });
      const existingSet = new Set(existing.map((e) => e.wargaId));
      const toCreate = wargaList.filter((w) => !existingSet.has(w.id));

      if (toCreate.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Tagihan untuk jenis & bulan ini sudah ada untuk semua warga",
          created: 0,
          skipped: wargaList.length,
        });
      }

      // Jika status lunas, buat kas trx + tagihan satu per satu (untuk link kasTrxId)
      // Jika belum_bayar, pakai createMany (lebih cepat)
      let createdCount = 0;
      if (finalStatus === "lunas") {
        const bulanNama = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember",
        ][Number(bulan) - 1];
        const tanggalTrx = tanggalBayar || `${tahun}-${String(bulan).padStart(2, "0")}-01`;
        for (const w of toCreate) {
          const trx = await db.kasTransaction.create({
            data: {
              tanggal: tanggalTrx,
              jenis: "masuk",
              kategori: jenisTagihan,
              jumlah: Number(nominal),
              keterangan: `${jenisTagihan} ${bulanNama} ${tahun} - ${w.namaLengkap}`,
              wargaId: w.id,
            },
          });
          await db.tagihan.create({
            data: {
              wargaId: w.id,
              jenisTagihan,
              nominal: Number(nominal),
              bulan: Number(bulan),
              tahun: Number(tahun),
              status: "lunas",
              keterangan: keterangan || null,
              kasTrxId: trx.id,
            },
          });
          createdCount++;
        }
      } else {
        const result = await db.tagihan.createMany({
          data: toCreate.map((w) => ({
            wargaId: w.id,
            jenisTagihan,
            nominal: Number(nominal),
            bulan: Number(bulan),
            tahun: Number(tahun),
            keterangan: keterangan || null,
          })),
        });
        createdCount = result.count;
      }

      return NextResponse.json({
        success: true,
        message: `${createdCount} tagihan berhasil dibuat (${finalStatus === "lunas" ? "Sudah Lunas" : "Belum Bayar"})`,
        created: createdCount,
        skipped: wargaList.length - createdCount,
        status: finalStatus,
      });
    }

    // Single create
    const { wargaId, jenisTagihan, nominal, bulan, tahun, keterangan } = body;
    if (!wargaId || !jenisTagihan || !nominal || !bulan || !tahun) {
      return NextResponse.json(
        { error: "wargaId, jenisTagihan, nominal, bulan, tahun wajib diisi" },
        { status: 400 }
      );
    }
    const warga = await db.warga.findUnique({ where: { id: wargaId } });
    if (!warga) {
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    }
    // Cek duplikat
    const dup = await db.tagihan.findFirst({
      where: { wargaId, jenisTagihan, bulan: Number(bulan), tahun: Number(tahun) },
    });
    if (dup) {
      return NextResponse.json(
        { error: `Tagihan ${jenisTagihan} untuk ${warga.namaLengkap} bulan ${bulan}/${tahun} sudah ada` },
        { status: 400 }
      );
    }

    const tagihan = await db.tagihan.create({
      data: {
        wargaId,
        jenisTagihan,
        nominal: Number(nominal),
        bulan: Number(bulan),
        tahun: Number(tahun),
        keterangan: keterangan || null,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: tagihan }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menyimpan tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}
