import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/berkas/download/[id] - serve file for download
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const berkas = await db.berkas.findUnique({ where: { id } });
    if (!berkas)
      return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });

    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", berkas.filePath);
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": berkas.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(berkas.namaBerkas)}"`,
        "Content-Length": String(berkas.fileSize),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal mengunduh berkas", detail: String(e) },
      { status: 500 }
    );
  }
}
