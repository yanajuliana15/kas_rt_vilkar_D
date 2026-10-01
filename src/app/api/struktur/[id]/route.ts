import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// PUT /api/struktur/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { jabatan, nama, wargaId, noHp, keterangan, urutan, koordinatorGang } = body;
    const existing = await db.struktur.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Struktur tidak ditemukan" }, { status: 404 });
    }
    const struktur = await db.struktur.update({
      where: { id },
      data: {
        jabatan,
        nama,
        wargaId: wargaId || null,
        noHp: noHp || null,
        keterangan: keterangan || null,
        urutan: Number(urutan) !== undefined ? Number(urutan) : undefined,
        koordinatorGang: koordinatorGang !== undefined ? (koordinatorGang || null) : undefined,
      },
    });
    return NextResponse.json({ data: struktur });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah struktur", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/struktur/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const { id } = await params;
    const existing = await db.struktur.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Struktur tidak ditemukan" }, { status: 404 });
    }
    await db.struktur.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus struktur", detail: String(e) },
      { status: 500 }
    );
  }
}
