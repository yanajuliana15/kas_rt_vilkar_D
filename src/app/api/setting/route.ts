import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/setting?key=iuranAmount
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (key) {
      const setting = await db.setting.findUnique({ where: { key } });
      return NextResponse.json({ data: setting ? setting.value : null });
    }
    const all = await db.setting.findMany();
    const map: Record<string, string> = {};
    all.forEach((s) => (map[s.key] = s.value));
    return NextResponse.json({ data: map });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengambil setting", detail: String(e) },
      { status: 500 }
    );
  }
}

// PUT /api/setting - upsert key-value
// body: { key, value }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key dan value wajib diisi" }, { status: 400 });
    }
    const setting = await db.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
    return NextResponse.json({ data: setting });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menyimpan setting", detail: String(e) },
      { status: 500 }
    );
  }
}
