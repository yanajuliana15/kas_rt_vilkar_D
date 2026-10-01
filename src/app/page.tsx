"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Paperclip,
  Target,
  Home,
  Database,
  Sun,
  Moon,
  Download,
  Sparkles,
  TrendingUp,
  Receipt,
  HandCoins,
  UserCheck,
  UsersRound,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dashboard } from "@/components/kas-rt/dashboard";
import { WargaSection } from "@/components/kas-rt/warga-section";
import { KasSection } from "@/components/kas-rt/kas-section";
import { TagihanSection } from "@/components/kas-rt/tagihan-section";
import { BerkasSection } from "@/components/kas-rt/berkas-section";
import { DokumentasiSection } from "@/components/kas-rt/dokumentasi-section";
import { PeminjamanSection } from "@/components/kas-rt/peminjaman-section";
import { SessionsSection } from "@/components/kas-rt/sessions-section";
import { StrukturSection } from "@/components/kas-rt/struktur-section";
import { UsersSection } from "@/components/kas-rt/users-section";
import { AuthButton } from "@/components/kas-rt/auth-button";
import { RoleBanner } from "@/components/kas-rt/role-banner";
import { BottomNav } from "@/components/kas-rt/bottom-nav";
import { MoreSheet } from "@/components/kas-rt/more-sheet";
import { useAuth } from "@/hooks/use-auth";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [seedOpen, setSeedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isAdmin, isGuest, isSuperadmin, role, logout } = useAuth();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["dashboard", "warga", "kas", "tagihan", "peminjaman", "berkas", "dokumentasi"].includes(tab)) {
      setActiveTab(tab);
    }
    // Toast untuk login/logout success setelah reload
    if (params.get("login") === "success") {
      const role = sessionStorage.getItem("loginSuccess") || "admin";
      sessionStorage.removeItem("loginSuccess");
      setTimeout(() => {
        toast({
          title: "✅ Login berhasil!",
          description: role === "superadmin" ? "Mode Superadmin aktif — akses penuh." : "Mode Admin aktif — bisa input & kelola data.",
        });
      }, 500);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("logout") === "success") {
      setTimeout(() => {
        toast({ title: "Logout berhasil", description: "Anda keluar dari mode admin" });
      }, 500);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const refreshDashboard = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Auto-switch ke Data Warga saat login (admin/superadmin)
  const prevIsAdmin = useRef(isAdmin);
  useEffect(() => {
    if (!prevIsAdmin.current && isAdmin) {
      setActiveTab("warga");
    }
    prevIsAdmin.current = isAdmin;
  }, [isAdmin]);

  // Fallback ke dashboard jika active tab admin-only/superadmin-only tapi user tidak punya akses
  useEffect(() => {
    const adminOnlyTabs = ["warga", "tagihan", "peminjaman", "berkas"];
    const superadminOnlyTabs = ["sessions", "users"];
    if ((adminOnlyTabs.includes(activeTab) && !isAdmin) || (superadminOnlyTabs.includes(activeTab) && !isSuperadmin)) {
      if (role !== "loading") setActiveTab("dashboard");
    }
  }, [isAdmin, isSuperadmin, role, activeTab]);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      toast({ title: "Aplikasi terinstall", description: "Kas Vilkar Kosambi Blok D siap dipakai dari home screen" });
    }
    setInstallPrompt(null);
  }

  async function handleResetData() {
    setResetting(true);
    try {
      const res = await fetch("/api/reset-data", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal reset");
      toast({
        title: "Data direset",
        description: "Semua data dihapus. Hanya akun superadmin tersisa (superadmin/super123). Halaman akan reload...",
      });
      setResetOpen(false);
      // Reload setelah 1.5 detik
      setTimeout(() => {
        window.location.href = window.location.pathname + "?reset=success&_t=" + Date.now();
      }, 1500);
    } catch (err) {
      toast({
        title: "Gagal reset",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal muat data contoh");
      toast({
        title: "Data contoh dimuat",
        description: `${json.warga} warga, ${json.transaksi} transaksi, ${json.tagihan} tagihan, ${json.peminjaman} peminjaman, ${json.dokumentasi} dokumentasi`,
      });
      refreshDashboard();
      setSeedOpen(false);
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  }

  const allNavItems = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "from-teal-500 to-emerald-500", adminOnly: false, superadminOnly: false },
    { value: "struktur", label: "Struktur", icon: UsersRound, color: "from-amber-500 to-orange-600", adminOnly: false, superadminOnly: false },
    { value: "warga", label: "Data Warga", icon: Users, color: "from-cyan-500 to-blue-500", adminOnly: true, superadminOnly: false },
    { value: "kas", label: "Kas Vilkar", icon: Wallet, color: "from-emerald-500 to-green-600", adminOnly: false, superadminOnly: false },
    { value: "tagihan", label: "Tagihan Warga", icon: Receipt, color: "from-violet-500 to-purple-600", adminOnly: true, superadminOnly: false },
    { value: "peminjaman", label: "Peminjaman", icon: HandCoins, color: "from-rose-500 to-red-600", adminOnly: true, superadminOnly: false },
    { value: "berkas", label: "Berkas", icon: Paperclip, color: "from-amber-500 to-orange-500", adminOnly: true, superadminOnly: false },
    { value: "dokumentasi", label: "Dokumentasi", icon: Target, color: "from-rose-500 to-pink-500", adminOnly: false, superadminOnly: false },
    { value: "sessions", label: "Pengguna Login", icon: UserCheck, color: "from-purple-500 to-fuchsia-600", adminOnly: false, superadminOnly: true },
    { value: "users", label: "Kelola Login", icon: KeyRound, color: "from-fuchsia-500 to-pink-600", adminOnly: false, superadminOnly: true },
  ];

  const navItems = useMemo(
    () => allNavItems.filter((item) => {
      if (item.superadminOnly) return isSuperadmin;
      if (item.adminOnly) return isAdmin;
      return true;
    }),
    [isAdmin, isSuperadmin]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30">
      <ServiceWorkerRegister />

      {/* Hero Header with gradient */}
      <header className="sticky top-0 z-40">
        <div
          className={`absolute inset-0 animated-gradient ${
            isAdmin
              ? "bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600"
              : "bg-gradient-to-r from-slate-700 via-teal-700 to-cyan-800"
          }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative container mx-auto px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-1 ring-white/30 shadow-lg"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm sm:text-lg leading-tight flex items-center gap-2 truncate">
                  <span className="truncate">Vilkar Kosambi Blok D</span>
                  <Badge className="hidden sm:inline-flex bg-white/20 text-white border-white/30 hover:bg-white/30 text-[10px] px-1.5 py-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" /> v3.0
                  </Badge>
                </h1>
                <p className="text-[11px] sm:text-xs text-white/80 hidden sm:block">
                  Sistem Pengelolaan Keuangan & Data Warga
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Desktop-only buttons */}
              {installPrompt && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInstall}
                  className="hidden sm:inline-flex gap-1.5 bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-md"
                >
                  <Download className="h-4 w-4" />
                  <span>Install App</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hidden sm:inline-flex text-white hover:bg-white/20"
                aria-label="Toggle theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <AuthButton />
              {isSuperadmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSeedOpen(true); }}
                  className="hidden sm:inline-flex gap-1.5 text-white hover:bg-white/20"
                  title="Muat data contoh untuk demo"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Data Contoh</span>
                </Button>
              )}
              {isSuperadmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                  className="hidden sm:inline-flex gap-1.5 text-white hover:bg-white/20"
                >
                  <Database className="h-4 w-4" />
                  <span>Reset Data</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation - glass effect (desktop only on mobile pakai BottomNav) */}
      <nav className="sticky top-14 sm:top-16 z-30 glass border-b border-border/40">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="hidden md:flex h-auto p-1.5 bg-transparent w-full justify-start gap-1 flex-wrap">
              {navItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Mobile: hanya judul tab aktif + RoleBanner (tab nav ada di BottomNav) */}
            <div className="md:hidden py-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {(() => {
                    const active = navItems.find((n) => n.value === activeTab);
                    if (!active) return null;
                    const Icon = active.icon;
                    return (
                      <>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${active.color} shadow-sm`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm">{active.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Content with animation */}
            <div className="py-4 sm:py-6">
              <div className="mb-4">
                <RoleBanner />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
                    <Dashboard refreshKey={refreshKey} isAdmin={isAdmin} />
                  </TabsContent>
                  <TabsContent value="struktur" className="mt-0 focus-visible:outline-none">
                    <StrukturSection isAdmin={isAdmin} />
                  </TabsContent>
                  {isAdmin && (
                    <TabsContent value="warga" className="mt-0 focus-visible:outline-none">
                      <WargaSection isAdmin={isAdmin} />
                    </TabsContent>
                  )}
                  <TabsContent value="kas" className="mt-0 focus-visible:outline-none">
                    <KasSection onRefresh={refreshDashboard} isAdmin={isAdmin} />
                  </TabsContent>
                  {isAdmin && (
                    <TabsContent value="tagihan" className="mt-0 focus-visible:outline-none">
                      <TagihanSection onRefresh={refreshDashboard} />
                    </TabsContent>
                  )}
                  {isAdmin && (
                    <TabsContent value="peminjaman" className="mt-0 focus-visible:outline-none">
                      <PeminjamanSection />
                    </TabsContent>
                  )}
                  {isAdmin && (
                    <TabsContent value="berkas" className="mt-0 focus-visible:outline-none">
                      <BerkasSection />
                    </TabsContent>
                  )}
                  <TabsContent value="dokumentasi" className="mt-0 focus-visible:outline-none">
                    <DokumentasiSection isAdmin={isAdmin} />
                  </TabsContent>
                  {isSuperadmin && (
                    <TabsContent value="sessions" className="mt-0 focus-visible:outline-none">
                      <SessionsSection />
                    </TabsContent>
                  )}
                  {isSuperadmin && (
                    <TabsContent value="users" className="mt-0 focus-visible:outline-none">
                      <UsersSection />
                    </TabsContent>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </nav>

      {/* Bottom Navigation (mobile only) - ala aplikasi Dana */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMoreClick={() => setMoreOpen(true)}
        navItems={navItems}
        isMoreOpen={moreOpen}
      />

      {/* More Sheet (mobile only) - bottom sheet ala Dana */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        installPrompt={installPrompt}
        onInstall={handleInstall}
        isAdmin={isAdmin}
        isSuperadmin={isSuperadmin}
        onSeed={() => setSeedOpen(true)}
        onReset={() => setResetOpen(true)}
        onLogout={logout}
      />
      {/* Footer */}
      <footer className="mt-auto border-t bg-gradient-to-r from-slate-900 to-teal-950 text-slate-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-emerald-600">
                <Home className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-medium text-white">Vilkar Kosambi Blok D</span>
              <Badge variant="outline" className="text-[10px] border-white/20 text-slate-300">PWA v3.0</Badge>
            </div>
            <div className="text-center sm:text-right text-xs text-slate-400">
              <p className="flex items-center gap-1 justify-center sm:justify-end">
                <TrendingUp className="h-3 w-3" />
                Next.js + Prisma + SQLite · Role-based Access
              </p>
              <p className="mt-0.5">© {new Date().getFullYear()} · Siap diupload ke Play Store via TWA</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Reset Data dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Semua Data?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-600">PERHATIAN:</strong> Semua data akan dihapus permanen:
              <br />• Data warga, kas, tagihan, peminjaman, berkas, dokumentasi, struktur
              <br />• Semua akun admin (kecuali superadmin)
              <br /><br />
              Yang tersisa: <strong>1 akun superadmin</strong> (login: superadmin / super123)
              <br /><br />
              Aksi ini tidak bisa dibatalkan. Pastikan Anda sudah backup data penting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetData}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetting ? "Meresset..." : "Ya, Reset Semua Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Data Contoh dialog (superadmin only) */}
      <AlertDialog open={seedOpen} onOpenChange={setSeedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Muat Data Contoh?</AlertDialogTitle>
            <AlertDialogDescription>
              Tambahkan data contoh untuk demo/testing:
              <br />• 6 warga contoh
              <br />• Transaksi kas (masuk & keluar)
              <br />• 54 tagihan (3 jenis × 3 bulan × 6 warga)
              <br />• 3 peminjaman contoh
              <br />• 6 dokumentasi (planning & hasil)
              <br />• 10 struktur pengurus + koordinator gang
              <br />• Akun admin, bendahara, sekretaris
              <br /><br />
              Hanya akan berjalan jika database masih kosong (atau data belum ada).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSeed}
              disabled={seeding}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {seeding ? "Memuat..." : "Ya, Muat Data Contoh"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
