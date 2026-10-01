"use client";

import { useEffect } from "react";

/**
 * Global fetch interceptor - monkey-patch window.fetch supaya SEMUA request
 * POST/PUT/DELETE ke /api/* otomatis dapat header x-auth-role + x-auth-token
 * dari localStorage. Ini backup kalau cookie bermasalah.
 *
 * Ini cover SEMUA fetch call di app, termasuk yang pakai `fetch` biasa
 * (bukan authFetch), jadi walau ada code lama yang belum pakai authFetch,
 * auth header tetap terkirim.
 */
export function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    const ROLE_KEY = "kasvilkar_role";
    const TOKEN_KEY = "kasvilkar_token";

    // @ts-expect-error - monkey-patch
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || "GET").toUpperCase();

      // Hanya intercept POST/PUT/DELETE ke /api/* (bukan /api/auth/*)
      const isWriteApi =
        (method === "POST" || method === "PUT" || method === "DELETE") &&
        url.includes("/api/") &&
        !url.includes("/api/auth/");

      if (isWriteApi) {
        try {
          const role = localStorage.getItem(ROLE_KEY);
          const token = localStorage.getItem(TOKEN_KEY);
          if (role && token) {
            const headers = new Headers(init?.headers);
            headers.set("x-auth-role", role);
            headers.set("x-auth-token", token);
            init = { ...init, headers, credentials: "include" };
          }
        } catch {
          // ignore localStorage access error
        }
      }

      return originalFetch.call(window, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
