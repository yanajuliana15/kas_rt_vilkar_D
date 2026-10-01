import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getRole } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/berkas?wargaId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wargaId = searchParams.get("wargaId") || undefined;

    const berkas = await db.berkas.findMany({
      where: wargaId ? { wargaId } : undefined,
      orderBy: { uploadedAt: "desc" },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: berkas });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data berkas", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/berkas (multipart/form-data)
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const wargaId = formData.get("wargaId") as string | null;
    const kategori = (formData.get("kategori") as string) || "Dokumen";
    const keterangan = (formData.get("keterangan") as string) || null;
    const namaBerkasInput = (formData.get("namaBerkas") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
    }
    if (!wargaId) {
      return NextResponse.json({ error: "Warga wajib dipilih" }, { status: 400 });
    }

    const warga = await db.warga.findUnique({ where: { id: wargaId } });
    if (!warga) {
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    }

    // Validasi ukuran (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || "";
    const storedName = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, storedName);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const berkas = await db.berkas.create({
      data: {
        wargaId,
        namaBerkas: namaBerkasInput || file.name,
        fileName: storedName,
        filePath: `/uploads/${storedName}`,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        kategori,
        keterangan,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: berkas }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal upload berkas", detail: String(e) },
      { status: 500 }
    );
  }
}
