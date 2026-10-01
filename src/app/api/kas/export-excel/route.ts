import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

function formatRupiah(n: number): number {
  return Math.round(n || 0);
}

// GET /api/kas/export-excel?jenis=&kategori=&from=&to=
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

    // Buat worksheet dengan struktur profesional
    const wb = XLSX.utils.book_new();

    // === Sheet 1: Laporan Kas (rapi, siap print) ===
    const titleRow = ["LAPORAN KAS VILKAR KOSAMBI BLOK D"];
    const periodeRow = (() => {
      if (from && to) return `Periode: ${from} s/d ${to}`;
      if (from) return `Periode: dari ${from}`;
      if (to) return `Periode: s/d ${to}`;
      return "Periode: Semua transaksi";
    })();
    const tanggalCetak = `Dicetak: ${new Date().toLocaleString("id-ID")}`;

    // Header tabel
    const headerRow = ["No", "Tanggal", "Jenis", "Kategori", "Uang Masuk", "Uang Keluar", "Saldo", "Warga", "Keterangan"];

    // Data rows dengan saldo berjalan
    let saldo = 0;
    const dataRows: (string | number)[][] = transactions.map((t, i) => {
      const masuk = t.jenis === "masuk" ? t.jumlah : 0;
      const keluar = t.jenis === "keluar" ? t.jumlah : 0;
      saldo += masuk - keluar;
      return [
        i + 1,
        t.tanggal,
        t.jenis === "masuk" ? "Masuk" : "Keluar",
        t.kategori,
        masuk,
        keluar,
        saldo,
        t.warga?.namaLengkap || "",
        t.keterangan || "",
      ];
    });

    // Total row
    const totalMasuk = transactions.filter((t) => t.jenis === "masuk").reduce((a, b) => a + b.jumlah, 0);
    const totalKeluar = transactions.filter((t) => t.jenis === "keluar").reduce((a, b) => a + b.jumlah, 0);
    const totalRow = ["", "", "", "TOTAL", totalMasuk, totalKeluar, saldo, "", ""];

    // Build sheet dengan AOA (array of arrays) supaya bisa kontrol merge & styling
    const aoa: (string | number)[][] = [
      [titleRow[0]],
      [periodeRow],
      [tanggalCetak],
      [], // baris kosong
      headerRow,
      ...dataRows,
      totalRow,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 8 },   // Jenis
      { wch: 18 },  // Kategori
      { wch: 15 },  // Uang Masuk
      { wch: 15 },  // Uang Keluar
      { wch: 15 },  // Saldo
      { wch: 22 },  // Warga
      { wch: 35 },  // Keterangan
    ];

    // Merge title row (A1:I1)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // periode
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // tanggal cetak
    ];

    // Styling: title bold & center, header bold, total bold
    // Cell styles
    const styleTitle = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" as const } };
    const styleSub = { font: { italic: true, sz: 10 }, alignment: { horizontal: "center" as const } };
    const styleHeader = { font: { bold: true }, fill: { fgColor: { rgb: "E0F2FE" } }, alignment: { horizontal: "center" as const, vertical: "center" as const } };
    const styleTotal = { font: { bold: true }, fill: { fgColor: { rgb: "FEF3C7" } } };
    const styleMasuk = { font: { color: { rgb: "166534" } } };
    const styleKeluar = { font: { color: { rgb: "991B1B" } } };

    // Apply styles
    // Title (row 0)
    if (ws["A1"]) ws["A1"].s = styleTitle;
    if (ws["A2"]) ws["A2"].s = styleSub;
    if (ws["A3"]) ws["A3"].s = styleSub;
    // Header (row 4)
    ["A5", "B5", "C5", "D5", "E5", "F5", "G5", "H5", "I5"].forEach((cell) => {
      if (ws[cell]) ws[cell].s = styleHeader;
    });
    // Data rows (row 5 onwards)
    dataRows.forEach((_, idx) => {
      const r = idx + 5; // 0-indexed row in sheet (header is row 4, data starts row 5)
      const jenisCell = `C${r + 1}`;
      if (ws[jenisCell]) {
        const jenisVal = (ws[jenisCell] as XLSX.CellObject).v;
        if (jenisVal === "Masuk") {
          if (ws[`E${r + 1}`]) (ws[`E${r + 1}`] as XLSX.CellObject).s = styleMasuk;
        } else if (jenisVal === "Keluar") {
          if (ws[`F${r + 1}`]) (ws[`F${r + 1}`] as XLSX.CellObject).s = styleKeluar;
        }
      }
    });
    // Total row (last)
    const totalRowIdx = aoa.length - 1; // 0-indexed
    ["A", "B", "C", "D", "E", "F", "G", "H", "I"].forEach((col) => {
      const cell = `${col}${totalRowIdx + 1}`;
      if (ws[cell]) (ws[cell] as XLSX.CellObject).s = styleTotal;
    });

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");

    // === Sheet 2: Ringkasan per Kategori ===
    const kategoriMap = new Map<string, { masuk: number; keluar: number; count: number }>();
    transactions.forEach((t) => {
      const k = t.kategori;
      if (!kategoriMap.has(k)) kategoriMap.set(k, { masuk: 0, keluar: 0, count: 0 });
      const e = kategoriMap.get(k)!;
      if (t.jenis === "masuk") e.masuk += t.jumlah;
      else e.keluar += t.jumlah;
      e.count++;
    });
    const ringkasRows: (string | number)[][] = [
      ["RINGKASAN PER KATEGORI"],
      [],
      ["Kategori", "Jumlah Transaksi", "Total Masuk", "Total Keluar", "Net"],
      ...Array.from(kategoriMap.entries()).map(([k, v]) => [k, v.count, v.masuk, v.keluar, v.masuk - v.keluar]),
      ["TOTAL", transactions.length, totalMasuk, totalKeluar, totalMasuk - totalKeluar],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ringkasRows);
    ws2["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    if (ws2["A1"]) ws2["A1"].s = styleTitle;
    ["A3", "B3", "C3", "D3", "E3"].forEach((c) => { if (ws2[c]) ws2[c].s = styleHeader; });
    const lastRow2 = ringkasRows.length - 1;
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cell = `${col}${lastRow2 + 1}`;
      if (ws2[cell]) (ws2[cell] as XLSX.CellObject).s = styleTotal;
    });
    XLSX.utils.book_append_sheet(wb, ws2, "Ringkasan Kategori");

    // === Sheet 3: Ringkasan per Bulan ===
    const bulanMap = new Map<string, { masuk: number; keluar: number; count: number }>();
    transactions.forEach((t) => {
      const m = t.tanggal.slice(0, 7); // yyyy-mm
      if (!bulanMap.has(m)) bulanMap.set(m, { masuk: 0, keluar: 0, count: 0 });
      const e = bulanMap.get(m)!;
      if (t.jenis === "masuk") e.masuk += t.jumlah;
      else e.keluar += t.jumlah;
      e.count++;
    });
    const bulanRows: (string | number)[][] = [
      ["RINGKASAN PER BULAN"],
      [],
      ["Bulan", "Jumlah Transaksi", "Total Masuk", "Total Keluar", "Saldo Bersih"],
      ...Array.from(bulanMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => [m, v.count, v.masuk, v.keluar, v.masuk - v.keluar]),
      ["TOTAL", transactions.length, totalMasuk, totalKeluar, totalMasuk - totalKeluar],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(bulanRows);
    ws3["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    if (ws3["A1"]) ws3["A1"].s = styleTitle;
    ["A3", "B3", "C3", "D3", "E3"].forEach((c) => { if (ws3[c]) ws3[c].s = styleHeader; });
    const lastRow3 = bulanRows.length - 1;
    ["A", "B", "C", "D", "E"].forEach((col) => {
      const cell = `${col}${lastRow3 + 1}`;
      if (ws3[cell]) (ws3[cell] as XLSX.CellObject).s = styleTotal;
    });
    XLSX.utils.book_append_sheet(wb, ws3, "Ringkasan Bulanan");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });

    const filename = `laporan-kas-vilkar-kosambi-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal export Excel kas", detail: String(e) },
      { status: 500 }
    );
  }
}
