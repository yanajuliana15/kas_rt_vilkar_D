"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, Sparkles, Database, Download, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  navItems: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  // Theme
  theme: string | undefined;
  onToggleTheme: () => void;
  // PWA
  installPrompt: unknown;
  onInstall: () => void;
  // Auth
  isSuperadmin: boolean;
  onSeed: () => void;
  onReset: () => void;
  onLogout: () => void;
}

/**
 * Bottom sheet ala aplikasi Dana — slide dari bawah ke setengah layar.
 * Isi: grid ikon menu yang tidak muat di BottomNav (tab admin-only,
 * sessions, users, settings, PWA install, data contoh, reset, logout).
 */
export function MoreSheet({
  open,
  onClose,
  navItems,
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  installPrompt,
  onInstall,
  isSuperadmin,
  onSeed,
  onReset,
  onLogout,
}: MoreSheetProps) {
  // Sembunyikan tab yang sudah ada di bottom nav utama
  const bottomNavTabs = ["dashboard", "struktur", "kas", "warga", "dokumentasi"];
  const extraTabs = navItems.filter((n) => !bottomNavTabs.includes(n.value));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu lainnya"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-base font-semibold">Menu Lainnya</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid menu utama (tab admin-only yang tidak muat di bottom nav) */}
            {extraTabs.length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Halaman</p>
                <div className="grid grid-cols-4 gap-2">
                  {extraTabs.map((item) => {
                    const isActive = activeTab === item.value;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        onClick={() => {
                          onTabChange(item.value);
                          onClose();
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all",
                          isActive ? "bg-emerald-50 dark:bg-emerald-950/50" : "hover:bg-muted/60"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm",
                            item.color
                          )}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-center leading-tight line-clamp-2">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section: Tampilan & Aplikasi */}
            <div className="px-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Tampilan & Aplikasi</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={onToggleTheme}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 transition-all"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-sm">
                    {theme === "dark" ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-white" />}
                  </div>
                  <span className="text-[11px] font-medium text-center">
                    {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                  </span>
                </button>

                {installPrompt ? (
                  <button
                    onClick={() => {
                      onInstall();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
                      <Download className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-center">Install App</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Section: Admin (superadmin only) */}
            {isSuperadmin && (
              <div className="px-4 pb-3">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Admin Tools</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      onSeed();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-center">Data Contoh</span>
                  </button>
                  <button
                    onClick={() => {
                      onReset();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 transition-all"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-sm">
                      <Database className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-center">Reset Data</span>
                  </button>
                </div>
              </div>
            )}

            {/* Logout button */}
            <div className="px-4 pt-2 pb-2">
              <Button
                variant="outline"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full gap-2 h-11 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
