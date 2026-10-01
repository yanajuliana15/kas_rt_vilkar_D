import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// GET /api/kas/export?jenis=&kategori=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jenis = searchParams.get("jenis") || undefined;
    const kategori = searchParams.get("kategori") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const where: Record<string, unknown> = {};
    if (jenis) where.jenis = jenis;
    if (kategori) where.kategori = kategori;
    if (from || to) {
      where.tanggal = {};
      if (from) (where.tanggal as { gte?: string }).gte = from;
      if (to) (where.tanggal as { lte?: string }).lte = to;
    }

    const transactions = await db.kasTransaction.findMany({
      where,
      orderBy: { tanggal: "asc" },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });

    let saldo = 0;
    const rows: string[] = [];
    rows.push(
      [
        "No",
        "Tanggal",
        "Jenis",
        "Kategori",
        "Uang Masuk",
        "Uang Keluar",
        "Saldo",
        "Warga (NIK - Nama)",
        "Keterangan",
      ].join(",")
    );

    transactions.forEach((t, i) => {
      const masuk = t.jenis === "masuk" ? t.jumlah : 0;
      const keluar = t.jenis === "keluar" ? t.jumlah : 0;
      saldo += masuk - keluar;
      const wargaLabel = t.warga ? `${t.warga.nik} - ${t.warga.namaLengkap}` : "";
      rows.push(
        [
          i + 1,
          escapeCsv(t.tanggal),
          escapeCsv(t.jenis === "masuk" ? "Masuk" : "Keluar"),
          escapeCsv(t.kategori),
          escapeCsv(formatRupiah(masuk)),
          escapeCsv(formatRupiah(keluar)),
          escapeCsv(formatRupiah(saldo)),
          escapeCsv(wargaLabel),
          escapeCsv(t.keterangan || ""),
        ].join(",")
      );
    });

    const totalMasuk = transactions
      .filter((t) => t.jenis === "masuk")
      .reduce((a, b) => a + b.jumlah, 0);
    const totalKeluar = transactions
      .filter((t) => t.jenis === "keluar")
      .reduce((a, b) => a + b.jumlah, 0);

    rows.push("");
    rows.push(`,,,Total Masuk,${escapeCsv(formatRupiah(totalMasuk))},,,,`);
    rows.push(`,,,Total Keluar,,${escapeCsv(formatRupiah(totalKeluar))},,,`);
    rows.push(`,,,Saldo Akhir,,,,${escapeCsv(formatRupiah(saldo))},,`);

    const csv = "\uFEFF" + rows.join("\n");
    const filename = `laporan-kas-rt-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal export laporan kas", detail: String(e) },
      { status: 500 }
    );
  }
}
