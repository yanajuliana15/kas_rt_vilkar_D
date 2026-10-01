"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Role = "superadmin" | "admin" | "warga" | "loading";

const AUTH_EVENT = "kasvilkar-auth-change";
const STORAGE_KEY = "kasvilkar_role";

interface AuthContextValue {
  role: Role;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  role: "loading",
  isSuperadmin: false,
  isAdmin: false,
  isGuest: false,
  refresh: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("loading");

  // refresh: HANYA dipanggil eksplisit (login/logout), TIDAK auto-sync yang bisa override localStorage.
  // localStorage = source of truth untuk UI. Cookie = untuk enforce API.
  const refresh = useCallback(() => {
    // Baca dari localStorage (instant, sync)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "superadmin" || stored === "admin") {
        setRole(stored);
        return;
      }
    } catch {}
    setRole("warga");
  }, []);

  // Mount: baca role dari localStorage DULU (instant)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const handler = () => refresh();
    window.addEventListener(AUTH_EVENT, handler);
    return () => window.removeEventListener(AUTH_EVENT, handler);
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setRole("warga");
    window.dispatchEvent(new Event(AUTH_EVENT));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        isSuperadmin: role === "superadmin",
        isAdmin: role === "admin" || role === "superadmin",
        isGuest: role === "warga",
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

// Helper untuk set role langsung (dipanggil setelah login berhasil, sebelum reload)
export function setStoredRole(role: "admin" | "superadmin") {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {}
}
