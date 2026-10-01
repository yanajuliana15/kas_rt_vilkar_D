import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// GET /api/warga/template - download template Excel kosong untuk import
export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template (header saja + 1 contoh row)
    const templateRows = [
      ["NIK", "Nama Lengkap", "Alias", "Jenis Kelamin (L/P)", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Alamat", "No. Rumah", "No. HP", "Email", "Pekerjaan", "Status (aktif/pindah/meninggal)", "Kepala Keluarga (Ya/Tidak)", "Keterangan"],
      ["3201010101900001", "Budi Santoso", "Pak Budi", "L", "Bandung", "1975-03-15", "Jl. Melati No. 1, Vilkar Kosambi Blok D", "A-01", "081234567801", "budi@email.com", "Guru", "aktif", "Ya", "Ketua Vilkar"],
      ["3201010202800002", "Siti Aminah", "Bu Siti", "P", "Jakarta", "1980-07-22", "Jl. Melati No. 1, Vilkar Kosambi Blok D", "A-01", "081234567802", "", "Ibu Rumah Tangga", "aktif", "Tidak", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    ws["!cols"] = [
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
      { wch: 18 }, { wch: 30 },
    ];
    // Style header bold
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E0F2FE" } } };
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1", "K1", "L1", "M1", "N1"].forEach((c) => {
      if (ws[c]) (ws[c] as XLSX.CellObject).s = headerStyle;
    });
    XLSX.utils.book_append_sheet(wb, ws, "Template Import");

    // Sheet 2: Petunjuk
    const petunjukRows = [
      ["PETUNJUK IMPORT DATA WARGA"],
      [],
      ["1. Isi data warga di sheet 'Template Import' (hapus baris contoh, isi data asli)."],
      ["2. Kolom WAJIB: NIK, Nama Lengkap, Jenis Kelamin (L/P), Alamat."],
      ["3. Kolom OPSIONAL: Alias, Tempat Lahir, Tanggal Lahir (format YYYY-MM-DD), No. Rumah, No. HP, Email, Pekerjaan, Status, Kepala Keluarga, Keterangan."],
      ["4. Jenis Kelamin: L (Laki-laki) atau P (Perempuan)."],
      ["5. Status: aktif / pindah / meninggal (default: aktif)."],
      ["6. Kepala Keluarga: Ya atau Tidak (default: Tidak)."],
      ["7. NIK harus 16 digit angka & unik (tidak boleh duplikat)."],
      ["8. Tanggal Lahir format: YYYY-MM-DD (mis: 1990-05-15)."],
      ["9. Setelah isi, save file lalu upload via menu Import Excel."],
      [],
      ["Kolom yang akan diimport:"],
      ["A: NIK*", "B: Nama Lengkap*", "C: Alias", "D: Jenis Kelamin* (L/P)", "E: Tempat Lahir"],
      ["F: Tanggal Lahir (YYYY-MM-DD)", "G: Alamat*", "H: No. Rumah", "I: No. HP", "J: Email"],
      ["K: Pekerjaan", "L: Status (aktif/pindah/meninggal)", "M: Kepala Keluarga (Ya/Tidak)", "N: Keterangan"],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(petunjukRows);
    ws2["!cols"] = [{ wch: 80 }];
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }];
    if (ws2["A1"]) (ws2["A1"] as XLSX.CellObject).s = { font: { bold: true, sz: 14 } };
    XLSX.utils.book_append_sheet(wb, ws2, "Petunjuk");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });
    const filename = `template-import-warga-${new Date().toISOString().slice(0, 10)}.xlsx`;

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
      { error: "Gagal generate template", detail: String(e) },
      { status: 500 }
    );
  }
}
