import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/dokumentasi?wargaId=&tipe=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wargaId = searchParams.get("wargaId") || undefined;
    const tipe = searchParams.get("tipe") || undefined;

    const where: Record<string, unknown> = {};
    if (wargaId) where.wargaId = wargaId;
    if (tipe) where.tipe = tipe;

    const docs = await db.dokumentasi.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: docs });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil dokumentasi", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/dokumentasi
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const body = await req.json();
    const { wargaId, judul, tipe, tanggal, deskripsi, targetDate, status, progress } = body;

    if (!wargaId || !judul || !tipe || !tanggal || !deskripsi) {
      return NextResponse.json(
        { error: "Warga, judul, tipe, tanggal, dan deskripsi wajib diisi" },
        { status: 400 }
      );
    }
    if (tipe !== "planning" && tipe !== "hasil") {
      return NextResponse.json({ error: "Tipe harus 'planning' atau 'hasil'" }, { status: 400 });
    }

    const warga = await db.warga.findUnique({ where: { id: wargaId } });
    if (!warga)
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });

    const doc = await db.dokumentasi.create({
      data: {
        wargaId,
        judul,
        tipe,
        tanggal,
        deskripsi,
        targetDate: targetDate || null,
        status: status || "berjalan",
        progress: Number.isFinite(Number(progress)) ? Math.min(100, Math.max(0, Number(progress))) : 0,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah dokumentasi", detail: String(e) },
      { status: 500 }
    );
  }
}
