import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/warga - list all warga, optional ?q=search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const warga = await db.warga.findMany({
      where: q
        ? {
            OR: [
              { namaLengkap: { contains: q } },
              { nik: { contains: q } },
              { alias: { contains: q } },
              { alamat: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: warga });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data warga", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/warga - create new warga (admin only)
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const body = await req.json();
    const {
      nik,
      namaLengkap,
      alias,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      alamat,
      noRumah,
      noHp,
      email,
      pekerjaan,
      status,
      kepalaKeluarga,
      keterangan,
    } = body;

    if (!nik || !namaLengkap || !jenisKelamin || !alamat) {
      return NextResponse.json(
        { error: "NIK, nama lengkap, jenis kelamin, dan alamat wajib diisi" },
        { status: 400 }
      );
    }

    const existing = await db.warga.findUnique({ where: { nik } });
    if (existing) {
      return NextResponse.json(
        { error: "NIK sudah terdaftar" },
        { status: 400 }
      );
    }

    const warga = await db.warga.create({
      data: {
        nik,
        namaLengkap,
        alias: alias || null,
        jenisKelamin,
        tempatLahir: tempatLahir || null,
        tanggalLahir: tanggalLahir || null,
        alamat,
        noRumah: noRumah || null,
        noHp: noHp || null,
        email: email || null,
        pekerjaan: pekerjaan || null,
        status: status || "aktif",
        kepalaKeluarga: !!kepalaKeluarga,
        keterangan: keterangan || null,
      },
    });
    return NextResponse.json({ data: warga }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah warga", detail: String(e) },
      { status: 500 }
    );
  }
}
