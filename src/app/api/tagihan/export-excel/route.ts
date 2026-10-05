import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const NAMA_BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// GET /api/tagihan/export-excel?tahun=2026&jenis=Iuran%20Bulanan
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();
    const jenis = searchParams.get("jenis") || undefined;

    const tagihan = await db.tagihan.findMany({
      where: {
        tahun,
        ...(jenis ? { jenisTagihan: jenis } : {}),
      },
      include: {
        warga: { select: { namaLengkap: true, alias: true, noRumah: true, status: true } },
      },
      orderBy: [{ bulan: "asc" }, { createdAt: "asc" }],
    });

    // Kelompokkan data per warga
    type CellInfo = { total: number; paid: number; count: number };
    const wargaMap = new Map<
      string,
      { nama: string; noRumah: string; months: Map<number, CellInfo> }
    >();

    for (const t of tagihan) {
      let w = wargaMap.get(t.wargaId);
      if (!w) {
        w = {
          nama: t.warga?.namaLengkap || "-",
          noRumah: t.warga?.noRumah || "-",
          months: new Map(),
        };
        wargaMap.set(t.wargaId, w);
      }
      const c = w.months.get(t.bulan) || { total: 0, paid: 0, count: 0 };
      c.total += t.nominal;
      if (t.status === "lunas") c.paid += t.nominal;
      c.count += 1;
      w.months.set(t.bulan, c);
    }

    const wargaRows = Array.from(wargaMap.entries()).sort((a, b) =>
      a[1].nama.localeCompare(b[1].nama)
    );

    const wb = XLSX.utils.book_new();

    // ============ SHEET 1: MATRIKS 12 BULAN ============
    const aoa1: (string | number)[][] = [];
    aoa1.push([`LAPORAN TAGIHAN WARGA TAHUN ${tahun}${jenis ? ` (${jenis})` : ""}`]);
    aoa1.push([`Dibuat: ${new Date().toLocaleString("id-ID")}`]);
    aoa1.push([]);
    aoa1.push([
      "No", "Nama Warga", "No. Rumah",
      ...NAMA_BULAN,
      "Total Tagihan", "Terbayar", "Kekurangan",
    ]);

    let grandTotal = 0;
    let grandPaid = 0;
    const monthTotals: number[] = Array(12).fill(0);

    wargaRows.forEach(([, w], idx) => {
      let total = 0;
      let paid = 0;
      const line: (string | number)[] = [idx + 1, w.nama, w.noRumah];
      for (let m = 1; m <= 12; m++) {
        const c = w.months.get(m);
        if (!c) {
          line.push("-");
          continue;
        }
        total += c.total;
        paid += c.paid;
        monthTotals[m - 1] += c.total;
        line.push(c.paid >= c.total ? "Lunas" : c.paid > 0 ? "Sebagian" : "Belum");
      }
      grandTotal += total;
      grandPaid += paid;
      line.push(total, paid, total - paid);
      aoa1.push(line);
    });

    if (wargaRows.length === 0) {
      aoa1.push(["", "Tidak ada data tagihan untuk tahun ini", ...Array(16).fill("")]);
    }

    const totalLine: (string | number)[] = [
      "", "TOTAL", "", ...monthTotals, grandTotal, grandPaid, grandTotal - grandPaid,
    ];
    aoa1.push([]);
    aoa1.push(totalLine);

    const ws1 = XLSX.utils.aoa_to_sheet(aoa1);
    ws1["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 10 },
      ...Array(12).fill({ wch: 9 }),
      { wch: 15 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Tagihan 12 Bulan");

    // ============ SHEET 2: RINCIAN SEMUA TAGIHAN ============
    const aoa2: (string | number)[][] = [];
    aoa2.push([`RINCIAN TAGIHAN WARGA TAHUN ${tahun}${jenis ? ` (${jenis})` : ""}`]);
    aoa2.push([]);
    aoa2.push([
      "No", "Nama Warga", "No. Rumah", "Jenis Tagihan",
      "Bulan", "Tahun", "Nominal", "Status", "Keterangan",
    ]);

    const sorted = [...tagihan].sort(
      (a, b) =>
        (a.warga?.namaLengkap || "").localeCompare(b.warga?.namaLengkap || "") ||
        a.bulan - b.bulan
    );
    sorted.forEach((t, idx) => {
      aoa2.push([
        idx + 1,
        t.warga?.namaLengkap || "-",
        t.warga?.noRumah || "-",
        t.jenisTagihan,
        NAMA_BULAN_PANJANG[t.bulan - 1] || String(t.bulan),
        t.tahun,
        t.nominal,
        t.status === "lunas" ? "LUNAS" : "BELUM BAYAR",
        t.keterangan || "",
      ]);
    });

    if (sorted.length === 0) {
      aoa2.push(["", "Tidak ada data", ...Array(7).fill("")]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
    ws2["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 10 }, { wch: 18 },
      { wch: 12 }, { wch: 7 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
    ];
    // format kolom Nominal (kolom index 6) sebagai angka ribuan
    for (let r = 3; r < aoa2.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 6 });
      const cell = ws2[addr] as XLSX.CellObject | undefined;
      if (cell && typeof cell.v === "number") cell.z = "#,##0";
    }
    XLSX.utils.book_append_sheet(wb, ws2, "Rincian Tagihan");

    // ============ SHEET 3: REKAP PER JENIS ============
    const jenisMap = new Map<string, { count: number; total: number; paid: number }>();
    for (const t of tagihan) {
      const j = jenisMap.get(t.jenisTagihan) || { count: 0, total: 0, paid: 0 };
      j.count += 1;
      j.total += t.nominal;
      if (t.status === "lunas") j.paid += t.nominal;
      jenisMap.set(t.jenisTagihan, j);
    }

    const aoa3: (string | number)[][] = [];
    aoa3.push([`REKAP TAGIHAN PER JENIS - TAHUN ${tahun}`]);
    aoa3.push([]);
    aoa3.push(["Jenis Tagihan", "Jumlah Record", "Total Nominal", "Terbayar", "Kekurangan"]);
    let rCount = 0, rTotal = 0, rPaid = 0;
    for (const [nama, j] of Array.from(jenisMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      aoa3.push([nama, j.count, j.total, j.paid, j.total - j.paid]);
      rCount += j.count;
      rTotal += j.total;
      rPaid += j.paid;
    }
    aoa3.push(["TOTAL", rCount, rTotal, rPaid, rTotal - rPaid]);

    const ws3 = XLSX.utils.aoa_to_sheet(aoa3);
    ws3["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    for (let r = 3; r < aoa3.length; r++) {
      for (const c of [2, 3, 4]) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws3[addr] as XLSX.CellObject | undefined;
        if (cell && typeof cell.v === "number") cell.z = "#,##0";
      }
    }
    XLSX.utils.book_append_sheet(wb, ws3, "Rekap Jenis");

    // ============ GENERATE FILE ============
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `tagihan-warga-${tahun}.xlsx`;

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
      { error: "Gagal export Excel tagihan", detail: String(e) },
      { status: 500 }
    );
  }
}
