"use client";

// Helper untuk fetch dengan auth header otomatis dari localStorage
// Ini backup kalau cookie tidak terkirim (cross-origin, SameSite issue, dll)

const ROLE_KEY = "kasvilkar_role";
const TOKEN_KEY = "kasvilkar_token";

export function getStoredRole(): "superadmin" | "admin" | "warga" {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    if (r === "superadmin" || r === "admin") return r;
  } catch {}
  return "warga";
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(role: "admin" | "superadmin", token: string) {
  try {
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// Wrapper fetch yang otomatis tambahkan auth headers
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const role = getStoredRole();
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (role !== "warga") {
    headers.set("x-auth-role", role);
    if (token) headers.set("x-auth-token", token);
  }
  return fetch(url, { ...options, headers, credentials: "include" });
}

// Helper khusus untuk POST/PUT/DELETE dengan JSON body
export async function authPost(url: string, body: unknown, method: "POST" | "PUT" | "DELETE" = "POST"): Promise<Response> {
  return authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
