import fs from "fs/promises";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "session-log.json");
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 hari

export interface SessionRecord {
  id: string; // session id (dari token)
  role: string;
  loginAt: string; // ISO
  logoutAt: string | null;
  ipAddress: string;
  userAgent: string;
}

async function readLog(): Promise<SessionRecord[]> {
  try {
    const data = await fs.readFile(LOG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLog(records: SessionRecord[]): Promise<void> {
  await fs.writeFile(LOG_FILE, JSON.stringify(records, null, 2), "utf-8");
}

// Catat login baru
export async function recordLogin(sessionId: string, role: string, req: Request): Promise<void> {
  const records = await readLog();
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  records.push({
    id: sessionId,
    role,
    loginAt: new Date().toISOString(),
    logoutAt: null,
    ipAddress: ip,
    userAgent: ua,
  });
  // Simpan maksimal 200 record terakhir
  const trimmed = records.slice(-200);
  await writeLog(trimmed);
}

// Catat logout (mark session as logged out)
export async function recordLogout(sessionId: string): Promise<void> {
  const records = await readLog();
  const rec = records.find((r) => r.id === sessionId && !r.logoutAt);
  if (rec) {
    rec.logoutAt = new Date().toISOString();
    await writeLog(records);
  }
}

// Ambil semua session (raw) - untuk superadmin
export async function getAllSessions(): Promise<SessionRecord[]> {
  const records = await readLog();
  return records.reverse(); // terbaru di atas
}

// Ambil session aktif (belum logout & belum expired)
export async function getActiveSessions(): Promise<SessionRecord[]> {
  const records = await readLog();
  const now = Date.now();
  return records.filter((r) => {
    if (r.logoutAt) return false;
    const loginTime = new Date(r.loginAt).getTime();
    return now - loginTime < SESSION_MAX_AGE;
  });
}

// Revoke session (force logout) - superadmin only
export async function revokeSession(sessionId: string): Promise<void> {
  const records = await readLog();
  const rec = records.find((r) => r.id === sessionId);
  if (rec && !rec.logoutAt) {
    rec.logoutAt = new Date().toISOString();
    await writeLog(records);
  }
}
