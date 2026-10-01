import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "kasvilkar-secret-key-2026-please-change";
export const AUTH_COOKIE = "kasvilkar_auth";
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 hari

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSession(role: string): string {
  const exp = Date.now() + SESSION_MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ role, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined | null): { role: string; sessionId?: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return { role: data.role, sessionId: payload.slice(0, 16) };
  } catch {
    return null;
  }
}

export type Role = "superadmin" | "admin" | "warga";

export async function getRole(req: Request): Promise<Role> {
  // 1. Cek cookie dulu (primary)
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  const token = match?.[1];
  const session = verifySession(token);
  const cookieRole = session?.role;
  if (cookieRole === "superadmin" || cookieRole === "admin") return cookieRole;

  // 2. Fallback: cek header custom X-Auth-Role (dari localStorage client)
  // Ini backup kalau cookie bermasalah (cross-origin, SameSite issue, dll)
  const headerRole = req.headers.get("x-auth-role");
  if (headerRole === "superadmin" || headerRole === "admin") {
    // Verifikasi token dari header juga (supaya tidak bisa di-spoof sembarangan)
    const headerToken = req.headers.get("x-auth-token");
    const tokenSession = verifySession(headerToken);
    if (tokenSession?.role === headerRole) return headerRole;
  }

  return "warga";
}

import { db } from "@/lib/db";

// ===== Password hashing (scrypt - built-in Node.js crypto) =====
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

// Verifikasi login user dari database (username + password)
// Return role jika valid, null jika tidak
export async function verifyUser(username: string, password: string): Promise<string | null> {
  const user = await db.adminUser.findUnique({ where: { username } });
  if (!user || !user.aktif) return null;
  if (!verifyHash(password, user.password)) return null;
  return user.role;
}

// Buat user baru (superadmin only)
export async function createUser(username: string, password: string, role: string, nama: string): Promise<void> {
  const hashed = hashPassword(password);
  await db.adminUser.create({
    data: { username, password: hashed, role, nama },
  });
}

// Update user (ganti password/role/nama)
export async function updateUser(id: string, data: { password?: string; role?: string; nama?: string; aktif?: boolean }): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.password) update.password = hashPassword(data.password);
  if (data.role) update.role = data.role;
  if (data.nama) update.nama = data.nama;
  if (data.aktif !== undefined) update.aktif = data.aktif;
  await db.adminUser.update({ where: { id }, data: update });
}

// Hapus user
export async function deleteUser(id: string): Promise<void> {
  await db.adminUser.delete({ where: { id } });
}

// Cek apakah ada user default (admin/superadmin), kalau belum ada, buat
export async function ensureDefaultUsers(): Promise<void> {
  const count = await db.adminUser.count();
  if (count > 0) return;
  await createUser("admin", "admin123", "admin", "Admin Default");
  await createUser("superadmin", "super123", "superadmin", "Superadmin Default");
}

// Verifikasi password berdasarkan role
export async function verifyPassword(role: string, password: string): Promise<boolean> {
  if (role !== "superadmin" && role !== "admin") return false;
  const key = role === "superadmin" ? "superadminPassword" : "adminPassword";
  const defaultPass = role === "superadmin" ? "super123" : "admin123";
  const setting = await db.setting.findUnique({ where: { key } });
  const stored = setting?.value || defaultPass;
  return password === stored;
}

export async function setPassword(role: string, password: string): Promise<void> {
  if (role !== "superadmin" && role !== "admin") return;
  const key = role === "superadmin" ? "superadminPassword" : "adminPassword";
  await db.setting.upsert({
    where: { key },
    create: { key, value: password },
    update: { value: password },
  });
}

// Reset password ke default
export async function resetPassword(role: string): Promise<void> {
  if (role !== "superadmin" && role !== "admin") return;
  const defaultPass = role === "superadmin" ? "super123" : "admin123";
  await setPassword(role, defaultPass);
}
