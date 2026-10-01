import { NextRequest, NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

// Force dynamic — JANGAN cache response ini, supaya role selalu fresh setelah login/logout
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const role = await getRole(req);
  const res = NextResponse.json({ role });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}
