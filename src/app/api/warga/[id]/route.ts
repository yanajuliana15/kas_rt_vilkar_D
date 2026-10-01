import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/warga/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warga = await db.warga.findUnique({
      where: { id },
      include: {
        kasTransactions: { orderBy: { tanggal: "desc" } },
        berkas: { orderBy: { uploadedAt: "desc" } },
        dokumentasi: { orderBy: { tanggal: "desc" } },
      },
    });
    if (!warga)
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: warga });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil detail warga", detail: String(e) },
      { status: 500 }
    );
  }
}

// PUT /api/warga/[id]
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
    const existing = await db.warga.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });

    if (body.nik && body.nik !== existing.nik) {
      const dup = await db.warga.findUnique({ where: { nik: body.nik } });
      if (dup)
        return NextResponse.json({ error: "NIK sudah dipakai warga lain" }, { status: 400 });
    }

    const warga = await db.warga.update({
      where: { id },
      data: {
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        alias: body.alias ?? null,
        jenisKelamin: body.jenisKelamin,
        tempatLahir: body.tempatLahir ?? null,
        tanggalLahir: body.tanggalLahir ?? null,
        alamat: body.alamat,
        noRumah: body.noRumah ?? null,
        noHp: body.noHp ?? null,
        email: body.email ?? null,
        pekerjaan: body.pekerjaan ?? null,
        status: body.status ?? "aktif",
        kepalaKeluarga: !!body.kepalaKeluarga,
        keterangan: body.keterangan ?? null,
      },
    });
    return NextResponse.json({ data: warga });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengubah data warga", detail: String(e) },
      { status: 500 }
    );
  }
}

// DELETE /api/warga/[id]
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
    const existing = await db.warga.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });

    await db.warga.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghapus warga", detail: String(e) },
      { status: 500 }
    );
  }
}
