import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// POST /api/warga/import (multipart/form-data, field "file")
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
    }

    // Parse Excel
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "File Excel kosong atau tidak ada data" }, { status: 400 });
    }

    // Helper: get value case-insensitive
    const get = (row: Record<string, unknown>, ...keys: string[]): string => {
      for (const k of keys) {
        for (const rk of Object.keys(row)) {
          if (rk.toLowerCase().trim() === k.toLowerCase().trim()) {
            return String(row[rk] ?? "").trim();
          }
        }
      }
      return "";
    };

    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [] as { row: number; nik: string; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 header, +1 0-indexed
      const nik = get(row, "NIK", "nik");
      const namaLengkap = get(row, "Nama Lengkap", "nama", "nama lengkap", "Nama");
      const alias = get(row, "Alias", "alias");
      let jenisKelamin = get(row, "Jenis Kelamin", "jk", "jenis kelamin", "Jenis Kelamin (L/P)").toUpperCase();
      const tempatLahir = get(row, "Tempat Lahir", "tempat lahir");
      const tanggalLahir = get(row, "Tanggal Lahir", "tanggal lahir", "Tanggal Lahir (YYYY-MM-DD)");
      const alamat = get(row, "Alamat", "alamat");
      const noRumah = get(row, "No. Rumah", "no rumah", "nomor rumah");
      const noHp = get(row, "No. HP", "no hp", "nomor hp", "hp");
      const email = get(row, "Email", "email");
      const pekerjaan = get(row, "Pekerjaan", "pekerjaan");
      let status = get(row, "Status", "status").toLowerCase() || "aktif";
      const kkRaw = get(row, "Kepala Keluarga", "kk", "kepala keluarga", "Kepala Keluarga (Ya/Tidak)").toLowerCase();
      const keterangan = get(row, "Keterangan", "keterangan");

      // Validasi wajib
      if (!nik) {
        results.failed++;
        results.errors.push({ row: rowNum, nik: "", error: "NIK kosong" });
        continue;
      }
      if (!namaLengkap) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: "Nama Lengkap kosong" });
        continue;
      }
      if (!jenisKelamin) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: "Jenis Kelamin kosong" });
        continue;
      }
      if (jenisKelamin !== "L" && jenisKelamin !== "P") {
        // Coba parse "Laki-laki" / "Perempuan"
        if (jenisKelamin.includes("LAKI") || jenisKelamin === "L") jenisKelamin = "L";
        else if (jenisKelamin.includes("PEREMPUAN") || jenisKelamin === "P") jenisKelamin = "P";
        else {
          results.failed++;
          results.errors.push({ row: rowNum, nik, error: `Jenis Kelamin tidak valid: "${jenisKelamin}" (harus L atau P)` });
          continue;
        }
      }
      if (!alamat) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: "Alamat kosong" });
        continue;
      }
      if (!["aktif", "pindah", "meninggal"].includes(status)) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: `Status tidak valid: "${status}" (harus aktif/pindah/meninggal)` });
        continue;
      }

      // Validasi tanggal lahir format
      let finalTanggalLahir = tanggalLahir;
      if (finalTanggalLahir) {
        // Coba parse berbagai format
        const d = new Date(finalTanggalLahir);
        if (!isNaN(d.getTime())) {
          finalTanggalLahir = d.toISOString().slice(0, 10);
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(finalTanggalLahir)) {
          // Skip invalid, biarkan apa adanya
        }
      }

      // Cek duplikat NIK
      const existing = await db.warga.findUnique({ where: { nik } });
      if (existing) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: "NIK sudah terdaftar" });
        continue;
      }

      try {
        await db.warga.create({
          data: {
            nik,
            namaLengkap,
            alias: alias || null,
            jenisKelamin,
            tempatLahir: tempatLahir || null,
            tanggalLahir: finalTanggalLahir || null,
            alamat,
            noRumah: noRumah || null,
            noHp: noHp || null,
            email: email || null,
            pekerjaan: pekerjaan || null,
            status,
            kepalaKeluarga: kkRaw === "ya" || kkRaw === "y" || kkRaw === "true" || kkRaw === "1",
            keterangan: keterangan || null,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, nik, error: err instanceof Error ? err.message : "Gagal insert" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import selesai: ${results.success} berhasil, ${results.failed} gagal dari ${results.total} baris`,
      results,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal import data", detail: String(e) },
      { status: 500 }
    );
  }
}
