"use client";

import { useState } from "react";
import { LogIn, LogOut, Shield, ShieldCheck, Lock, Eye, EyeOff, KeyRound, UserCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, notifyAuthChange, setStoredRole } from "@/hooks/use-auth";
import { setStoredAuth, clearStoredAuth } from "@/lib/api-client";

export function AuthButton() {
  const { role, isSuperadmin, isAdmin, refresh, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  async function handleReset() {
    setResetting(true);
    try {
      // Reset = recreate default users via seed endpoint (superadmin only, but reset endpoint is open)
      const res = await fetch("/api/auth/reset", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal reset");
      toast({
        title: "Default users direset",
        description: "Akun default admin & superadmin telah dibuat ulang. Hubungi superadmin untuk kredensial.",
      });
      setUsername("");
      setPassword("");
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal login");
      // SIMPAN role + token ke localStorage
      if (json.token && json.role) {
        setStoredAuth(json.role as "admin" | "superadmin", json.token);
      }
      try {
        sessionStorage.setItem("loginSuccess", json.role === "superadmin" ? "superadmin" : "admin");
      } catch {}
      // Reload halaman
      window.location.href = window.location.pathname + "?login=success&_t=" + Date.now();
    } catch (err) {
      toast({
        title: "Login gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // CLEAR localStorage (role + token) SEBELUM reload
    try {
      localStorage.removeItem("kasvilkar_role");
    } catch {}
    clearStoredAuth();
    // Reload halaman agar UI reset ke guest mode
    window.location.href = window.location.pathname + "?logout=success&_t=" + Date.now();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: isSuperadmin ? "superadmin" : "admin",
          currentPassword: password,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal ganti password");
      toast({ title: "Berhasil", description: "Password diperbarui" });
      setPassword("");
      setNewPassword("");
      setPasswordOpen(false);
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (role === "loading") {
    return <div className="h-9 w-9 rounded animate-pulse bg-white/20" />;
  }

  if (isAdmin) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <Badge className={`gap-1 text-white border-white/30 hover:bg-white/30 ${
            isSuperadmin ? "bg-purple-500/40" : "bg-violet-500/40"
          }`}>
            {isSuperadmin ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
            {isSuperadmin ? "Superadmin" : "Admin"}
          </Badge>
          <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="Ganti Password">
                <KeyRound className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Ganti Password {isSuperadmin ? "Superadmin" : "Admin"}</DialogTitle>
                <DialogDescription>Masukkan password saat ini dan password baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="curPass">Password Saat Ini</Label>
                  <div className="relative">
                    <Input
                      id="curPass"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPass">Password Baru (min 4 karakter)</Label>
                  <Input
                    id="newPass"
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20" title="Logout" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </>
    );
  }

  return (
    <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-white hover:bg-white/20" aria-label="Login pengelola">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Login</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" /> Login Pengelola
          </DialogTitle>
          <DialogDescription>
            Masukkan username & password. Warga tanpa login hanya bisa melihat data terbatas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-3" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                required
                className="pl-9"
                placeholder="mis: admin, superadmin, bendahara01"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 pr-9"
                placeholder="••••••"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            <strong>🔒 Privasi:</strong> Masukkan username & password yang diberikan admin. Jangan bagikan kredensial ke orang lain.
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button type="submit" disabled={loading} className="w-full gap-1.5">
              <Shield className="h-4 w-4" />
              {loading ? "Memproses..." : "Login"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <KeyRound className="h-3 w-3" />
              {resetting ? "Merestart..." : "Lupa? Reset default users"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
