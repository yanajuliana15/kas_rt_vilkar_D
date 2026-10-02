import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  try {
    const prisma = new PrismaClient();
    const users = await prisma.adminUser.findMany();
    await prisma.$disconnect();
    return NextResponse.json({ ok: true, total: users.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}