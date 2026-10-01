"use client";

import { LayoutDashboard, Wallet, UsersRound, MoreHorizontal, Users, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMoreClick: () => void;
  navItems: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;
  isMoreOpen: boolean;
}

/**
 * Bottom navigation ala aplikasi Dana — fixed di bawah, 5 slot,
 * slot ketiga (Kas) dibuat prominent (FAB-style) supaya jadi focal point.
 * Hanya muncul di mobile (md:hidden).
 */
export function BottomNav({
  activeTab,
  onTabChange,
  onMoreClick,
  navItems,
  isMoreOpen,
}: BottomNavProps) {
  // Tampilkan maks 4 tab primary + 1 slot "More"
  // Prioritas: Dashboard, Struktur, Kas (center prominent), dan 1 tab role-based
  const primaryTabs = ["dashboard", "struktur", "kas"];
  const extraTab = navItems.find((n) => ["warga", "dokumentasi"].includes(n.value));

  // Susun 5 slot
  const slots: Array<{
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    isCenter?: boolean;
    isMore?: boolean;
  }> = [];

  // Slot 1: Dashboard
  const dashboard = navItems.find((n) => n.value === "dashboard");
  if (dashboard) slots.push({ ...dashboard, label: "Beranda" });

  // Slot 2: Struktur
  const struktur = navItems.find((n) => n.value === "struktur");
  if (struktur) slots.push({ ...struktur, label: "Struktur" });

  // Slot 3: Kas (center prominent)
  const kas = navItems.find((n) => n.value === "kas");
  if (kas) slots.push({ ...kas, label: "Kas", isCenter: true });

  // Slot 4: Warga (admin) atau Dokumentasi (guest)
  if (extraTab) slots.push({ ...extraTab, label: extraTab.value === "warga" ? "Warga" : "Dokumentasi" });

  // Slot 5: More
  slots.push({ value: "__more__", label: "Menu", icon: MoreHorizontal, color: "from-slate-500 to-slate-600", isMore: true });

  return (
    <>
      {/* Spacer supaya konten tidak ketutup bottom nav */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigasi utama mobile"
      >
        <div className="relative max-w-md mx-auto px-2 h-16 flex items-stretch justify-around">
          {slots.map((slot) => {
            const isActive = !slot.isMore && activeTab === slot.value;
            const Icon = slot.icon;

            if (slot.isCenter) {
              // FAB-style center button (ala Dana pay button)
              return (
                <button
                  key={slot.value}
                  onClick={() => onTabChange(slot.value)}
                  className="flex flex-col items-center justify-end -mt-6 w-16 group"
                  aria-label={slot.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-background transition-all group-active:scale-90",
                      isActive
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                        : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-medium leading-none",
                      isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {slot.label}
                  </span>
                </button>
              );
            }

            if (slot.isMore) {
              return (
                <button
                  key="more"
                  onClick={onMoreClick}
                  className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 group"
                  aria-label="Menu lainnya"
                  aria-expanded={isMoreOpen}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                      isMoreOpen && "bg-emerald-50 dark:bg-emerald-950"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isMoreOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
                      isMoreOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {slot.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={slot.value}
                onClick={() => onTabChange(slot.value)}
                className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 group"
                aria-label={slot.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute -bottom-1 h-1 w-6 rounded-full bg-emerald-500"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none truncate max-w-full",
                    isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {slot.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
