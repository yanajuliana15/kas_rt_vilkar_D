import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// ---- Pembagian gang (harus sinkron dengan src/components/kas-rt/tagihan-section.tsx) ----
// Kelompok penagihan antar blok sesuai buku tagihan RT; satu kelompok bisa menyambung 2 blok.
const GANG_SECTIONS: { label: string; blok: number; min: number; max: number }[] = [
  { label: "D1/D2", blok: 1, min: 13, max: 27 },
  { label: "D1/D2", blok: 2, min: 1, max: 11 },
  { label: "D3/D4", blok: 3, min: 1, max: 12 },
  { label: "D3/D4", blok: 4, min: 1, max: 12 },
  { label: "D4/D5", blok: 4, min: 13, max: 25 },
  { label: "D4/D5", blok: 5, min: 1, max: 13 },
  { label: "D5/D6", blok: 5, min: 14, max: 27 },
  { label: "D5/D6", blok: 6, min: 1, max: 15 },
  { label: "D6/D7", blok: 6, min: 16, max: 30 },
  { label: "D6/D7", blok: 7, min: 1, max: 16 },
  { label: "D7/D8", blok: 7, min: 17, max: 32 },
  { label: "D7/D8", blok: 8, min: 1, max: 12 },
  { label: "D7/D8", blok: 8, min: 24, max: 35 },
  { label: "D7/D8", blok: 9, min: 1, max: 14 },
  { label: "D10", blok: 10, min: 1, max: 999 },
  { label: "D11", blok: 11, min: 1, max: 999 },
];

// Ambil nomor blok & nomor rumah dari NIK / no. rumah, mis. "D4-12" -> blok 4, rumah 12
function parseBlokRumah(nik?: string | null, rumah?: string | null): { blok: number; rumah: number } | null {
  const s = (nik || "").trim();
  const m = s.match(/^D\s*(\d+)\s*[-/\s]\s*(\d+)$/i); // bentuk "D4-12" / "D4/12" / "D4 12"
  if (m) return { blok: parseInt(m[1], 10), rumah: parseInt(m[2], 10) };
  const b = s.match(/^D\s*(\d+)/i); // NIK "D4..." -> nomor rumah diambil dari kolom no. rumah
  if (b) {
    const h = (rumah || "").match(/(\d+)/);
    if (h) return { blok: parseInt(b[1], 10), rumah: parseInt(h[1], 10) };
    const h2 = s.match(/(\d+)\s*$/); // no. rumah kosong -> pakai angka di ujung NIK
    if (h2) return { blok: parseInt(b[1], 10), rumah: parseInt(h2[1], 10) };
  }
  return null;
}

// Label gang sebuah warga; rumah di luar daftar dikelompokkan per blok (mis. "D8")
function gangOfWarga(w: { nik?: string | null; noRumah?: string | null }): string {
  const p = parseBlokRumah(w.nik, w.noRumah);
  if (!p) return "";
  const sec = GANG_SECTIONS.find((s) => s.blok === p.blok && p.rumah >= s.min && p.rumah <= s.max);
  return sec ? sec.label : `D${p.blok}`;
}

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
// POST /api/tagihan?bulk=true - generate bulk untuk semua warga aktif (atau per gang)
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
      // Generate massal — semua gang atau satu gang saja (mis. "D3/D4")
      const { jenisTagihan, nominal, bulan, tahun, keterangan, onlyActive = true, status = "belum_bayar", tanggalBayar, gang } = body;
      if (!jenisTagihan || !nominal || !bulan || !tahun) {
        return NextResponse.json(
          { error: "jenisTagihan, nominal, bulan, tahun wajib diisi" },
          { status: 400 }
        );
      }
      if (gang !== undefined && gang !== null && typeof gang !== "string") {
        return NextResponse.json({ error: "Parameter gang tidak valid" }, { status: 400 });
      }
      const finalStatus = status === "lunas" ? "lunas" : "belum_bayar";
      const wargaList = await db.warga.findMany({
        where: onlyActive ? { status: "aktif" } : undefined,
        select: { id: true, namaLengkap: true, nik: true, noRumah: true },
      });
      // Filter per gang (opsional): cocokkan label gang dari NIK/no. rumah
      const gangList = gang ? wargaList.filter((w) => gangOfWarga(w) === gang) : wargaList;
      if (gang && gangList.length === 0) {
        return NextResponse.json({
          success: true,
          message: `Tidak ada warga aktif di Gang ${gang}`,
          created: 0,
          skipped: 0,
        });
      }
      // Cek duplikat
      const existing = await db.tagihan.findMany({
        where: { jenisTagihan, bulan: Number(bulan), tahun: Number(tahun) },
        select: { wargaId: true },
      });
      const existingSet = new Set(existing.map((e) => e.wargaId));
      const toCreate = gangList.filter((w) => !existingSet.has(w.id));

      if (toCreate.length === 0) {
        return NextResponse.json({
          success: true,
          message: gang
            ? `Tagihan untuk jenis & bulan ini sudah ada untuk semua warga Gang ${gang}`
            : "Tagihan untuk jenis & bulan ini sudah ada untuk semua warga",
          created: 0,
          skipped: gangList.length,
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
        message: `${createdCount} tagihan berhasil dibuat${gang ? ` untuk Gang ${gang}` : ""} (${finalStatus === "lunas" ? "Sudah Lunas" : "Belum Bayar"})`,
        created: createdCount,
        skipped: gangList.length - createdCount,
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
