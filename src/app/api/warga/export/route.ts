import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/warga/export - export semua data warga ke Excel
export async function GET() {
  try {
    const warga = await db.warga.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Format data untuk Excel
    const rows = warga.map((w, i) => ({
      "No": i + 1,
      "NIK": w.nik,
      "Nama Lengkap": w.namaLengkap,
      "Alias": w.alias || "",
      "Jenis Kelamin": w.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
      "Tempat Lahir": w.tempatLahir || "",
      "Tanggal Lahir": w.tanggalLahir || "",
      "Alamat": w.alamat,
      "No. Rumah": w.noRumah || "",
      "No. HP": w.noHp || "",
      "Email": w.email || "",
      "Pekerjaan": w.pekerjaan || "",
      "Status": w.status,
      "Kepala Keluarga": w.kepalaKeluarga ? "Ya" : "Tidak",
      "Keterangan": w.keterangan || "",
    }));

    // Buat worksheet
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },   // No
      { wch: 20 },  // NIK
      { wch: 25 },  // Nama Lengkap
      { wch: 15 },  // Alias
      { wch: 12 },  // Jenis Kelamin
      { wch: 15 },  // Tempat Lahir
      { wch: 12 },  // Tanggal Lahir
      { wch: 40 },  // Alamat
      { wch: 10 },  // No. Rumah
      { wch: 15 },  // No. HP
      { wch: 25 },  // Email
      { wch: 18 },  // Pekerjaan
      { wch: 10 },  // Status
      { wch: 15 },  // Kepala Keluarga
      { wch: 30 },  // Keterangan
    ];

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Warga");

    // Generate Excel buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `data-warga-vilkar-kosambi-${new Date().toISOString().slice(0, 10)}.xlsx`;

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
      { error: "Gagal export data warga", detail: String(e) },
      { status: 500 }
    );
  }
}
