import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

// GET /api/kas - list with optional filters: ?jenis=&kategori=&from=&to=&q=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jenis = searchParams.get("jenis") || undefined;
    const kategori = searchParams.get("kategori") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const q = searchParams.get("q")?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (jenis) where.jenis = jenis;
    if (kategori) where.kategori = kategori;
    if (from || to) {
      where.tanggal = {};
      if (from) (where.tanggal as { gte?: string }).gte = from;
      if (to) (where.tanggal as { lte?: string }).lte = to;
    }
    if (q) where.keterangan = { contains: q };

    const transactions = await db.kasTransaction.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: transactions });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil data kas", detail: String(e) },
      { status: 500 }
    );
  }
}

// POST /api/kas
export async function POST(req: NextRequest) {
  try {
    const role = await getRole(req);
    if (role === "warga") {
      return NextResponse.json({ error: "Akses ditolak. Login sebagai admin." }, { status: 403 });
    }
    const body = await req.json();
    const { tanggal, jenis, kategori, jumlah, keterangan, buktiUrl, wargaId } = body;

    if (!tanggal || !jenis || !kategori || jumlah === undefined) {
      return NextResponse.json(
        { error: "Tanggal, jenis, kategori, dan jumlah wajib diisi" },
        { status: 400 }
      );
    }
    if (jenis !== "masuk" && jenis !== "keluar") {
      return NextResponse.json({ error: "Jenis harus 'masuk' atau 'keluar'" }, { status: 400 });
    }
    if (Number(jumlah) <= 0) {
      return NextResponse.json({ error: "Jumlah harus lebih besar dari 0" }, { status: 400 });
    }

    const trx = await db.kasTransaction.create({
      data: {
        tanggal,
        jenis,
        kategori,
        jumlah: Number(jumlah),
        keterangan: keterangan || null,
        buktiUrl: buktiUrl || null,
        wargaId: wargaId || null,
      },
      include: { warga: { select: { namaLengkap: true, nik: true } } },
    });
    return NextResponse.json({ data: trx }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menambah transaksi kas", detail: String(e) },
      { status: 500 }
    );
  }
}
