import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard - summary stats
export async function GET() {
  try {
    const [warga, transactions, berkas, dokumentasi, tagihan] = await Promise.all([
      db.warga.findMany({ select: { id: true, jenisKelamin: true, status: true, kepalaKeluarga: true } }),
      db.kasTransaction.findMany({ select: { id: true, jenis: true, jumlah: true, tanggal: true, kategori: true, wargaId: true } }),
      db.berkas.findMany({ select: { id: true, fileSize: true, kategori: true } }),
      db.dokumentasi.findMany({ select: { id: true, tipe: true, status: true, progress: true } }),
      db.tagihan.findMany({ select: { id: true, nominal: true, status: true, bulan: true, tahun: true, jenisTagihan: true } }),
    ]);

    // Tagihan stats untuk tahun & bulan ini
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const tagihanBulanIni = tagihan.filter(
      (t) => t.bulan === currentMonth && t.tahun === currentYear
    );
    const tagihanLunasBulanIni = tagihanBulanIni.filter((t) => t.status === "lunas");
    const tagihanTahunIni = tagihan.filter((t) => t.tahun === currentYear);
    const tagihanLunasTahunIni = tagihanTahunIni.filter((t) => t.status === "lunas");
    const tagihanCollectionRate = tagihanBulanIni.length > 0
      ? Math.round((tagihanLunasBulanIni.length / tagihanBulanIni.length) * 100)
      : 0;
    const tagihanTerkumpulTahunIni = tagihanLunasTahunIni.reduce((a, b) => a + b.nominal, 0);
    const tagihanTotalTahunIni = tagihanTahunIni.reduce((a, b) => a + b.nominal, 0);

    const totalMasuk = transactions
      .filter((t) => t.jenis === "masuk")
      .reduce((a, b) => a + b.jumlah, 0);
    const totalKeluar = transactions
      .filter((t) => t.jenis === "keluar")
      .reduce((a, b) => a + b.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;

    const totalWarga = warga.length;
    const lakiLaki = warga.filter((w) => w.jenisKelamin === "L").length;
    const perempuan = warga.filter((w) => w.jenisKelamin === "P").length;
    const wargaAktif = warga.filter((w) => w.status === "aktif").length;
    const kepalaKeluarga = warga.filter((w) => w.kepalaKeluarga).length;

    // kategori breakdown
    const kategoriMap = new Map<string, { masuk: number; keluar: number }>();
    transactions.forEach((t) => {
      const k = t.kategori;
      if (!kategoriMap.has(k)) kategoriMap.set(k, { masuk: 0, keluar: 0 });
      const entry = kategoriMap.get(k)!;
      if (t.jenis === "masuk") entry.masuk += t.jumlah;
      else entry.keluar += t.jumlah;
    });
    const kategoriBreakdown = Array.from(kategoriMap.entries()).map(([kategori, v]) => ({
      kategori,
      masuk: v.masuk,
      keluar: v.keluar,
    }));

    // monthly trend (last 6 months)
    const months: { label: string; key: string; masuk: number; keluar: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
      months.push({ label, key, masuk: 0, keluar: 0 });
    }
    transactions.forEach((t) => {
      const key = t.tanggal.slice(0, 7); // yyyy-mm
      const m = months.find((mm) => mm.key === key);
      if (m) {
        if (t.jenis === "masuk") m.masuk += t.jumlah;
        else m.keluar += t.jumlah;
      }
    });

    const planningCount = dokumentasi.filter((d) => d.tipe === "planning").length;
    const hasilCount = dokumentasi.filter((d) => d.tipe === "hasil").length;
    const planningSelesai = dokumentasi.filter(
      (d) => d.tipe === "planning" && d.status === "selesai"
    ).length;

    return NextResponse.json({
      data: {
        keuangan: {
          totalMasuk,
          totalKeluar,
          saldo,
          jumlahTransaksi: transactions.length,
        },
        warga: {
          total: totalWarga,
          lakiLaki,
          perempuan,
          aktif: wargaAktif,
          kepalaKeluarga,
        },
        berkas: {
          total: berkas.length,
          totalSize: berkas.reduce((a, b) => a + b.fileSize, 0),
        },
        dokumentasi: {
          total: dokumentasi.length,
          planning: planningCount,
          hasil: hasilCount,
          planningSelesai,
        },
        tagihan: {
          bulanIniTotal: tagihanBulanIni.length,
          bulanIniLunas: tagihanLunasBulanIni.length,
          collectionRateBulanIni: tagihanCollectionRate,
          terkumpulTahunIni: tagihanTerkumpulTahunIni,
          totalTahunIni: tagihanTotalTahunIni,
          belumBayarTahunIni: tagihanTahunIni.length - tagihanLunasTahunIni.length,
        },
        kategoriBreakdown,
        monthlyTrend: months,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard", detail: String(e) },
      { status: 500 }
    );
  }
}
