import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/struktur
export async function GET() {
  try {
    const list = await db.struktur.findMany({
      orderBy: { urutan: "asc" },
    });
    return NextResponse.json({ data: list });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data struktur", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/struktur (admin only)
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const body = await req.json();
    const { jabatan, nama, wargaId, noHp, keterangan, urutan, koordinatorGang } = body;
    if (!jabatan || !nama) {
      return NextResponse.json({ error: "Jabatan dan nama wajib diisi" }, { status: 400 });
    }
    const struktur = await db.struktur.create({
      data: {
        jabatan,
        nama,
        wargaId: wargaId || null,
        noHp: noHp || null,
        keterangan: keterangan || null,
        urutan: Number(urutan) || 0,
        koordinatorGang: koordinatorGang || null,
      },
    });
    return NextResponse.json({ data: struktur }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah struktur", detail: String(e) },
      { status: 500 }
    );
  }
}
