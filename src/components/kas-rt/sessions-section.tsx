"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  ShieldCheck,
  Shield,
  LogIn,
  LogOut,
  Clock,
  Globe,
  Monitor,
  Trash2,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";

interface SessionRecord {
  id: string;
  role: string;
  loginAt: string;
  logoutAt: string | null;
  ipAddress: string;
  userAgent: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) device = "Mobile";

  return { browser, os, device };
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"active" | "all">("active");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const { toast } = useToast();

  const fetchSessions = useCallback(() => {
    setLoading(true);
    fetch(`/api/sessions?mode=${mode}`)
      .then((r) => r.json())
      .then((j) => setSessions(j.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    fetchSessions();
    // Auto-refresh setiap 10 detik untuk update real-time
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  async function handleRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/sessions/${revokeId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal revoke");
      }
      toast({ title: "Session direvoke", description: "Pengguna tersebut telah dipaksa logout." });
      setRevokeId(null);
      fetchSessions();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  }

  const activeCount = sessions.filter((s) => !s.logoutAt).length;
  const adminCount = sessions.filter((s) => !s.logoutAt && s.role === "admin").length;
  const superadminCount = sessions.filter((s) => !s.logoutAt && s.role === "superadmin").length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sedang Online</CardTitle>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950 p-2">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{mode === "active" ? activeCount : sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">session {mode === "active" ? "aktif" : "total"}</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Online</CardTitle>
            <div className="rounded-full bg-violet-50 dark:bg-violet-950 p-2">
              <Shield className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">admin aktif</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-purple-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Superadmin Online</CardTitle>
            <div className="rounded-full bg-purple-50 dark:bg-purple-950 p-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{superadminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">superadmin aktif</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Riwayat</CardTitle>
            <div className="rounded-full bg-cyan-50 dark:bg-cyan-950 p-2">
              <Users className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">session tercatat</p>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-2">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                Pengguna Login
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Pantau siapa saja yang sedang login & riwayat session. Khusus Superadmin.
              </CardDescription>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "active" | "all")}>
              <TabsList>
                <TabsTrigger value="active" className="gap-1">
                  <Activity className="h-3.5 w-3.5" /> Sedang Online
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1">
                  <Clock className="h-3.5 w-3.5" /> Semua Riwayat
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded shimmer" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              {mode === "active" ? "Tidak ada pengguna yang sedang online." : "Belum ada riwayat login."}
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-md border scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login</TableHead>
                    {mode === "all" && <TableHead>Logout</TableHead>}
                    <TableHead>Perangkat</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s, i) => {
                    const ua = parseUA(s.userAgent);
                    const isActive = !s.logoutAt;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          {s.role === "superadmin" ? (
                            <Badge className="bg-purple-500 hover:bg-purple-600 gap-1">
                              <ShieldCheck className="h-3 w-3" /> Superadmin
                            </Badge>
                          ) : (
                            <Badge className="bg-violet-500 hover:bg-violet-600 gap-1">
                              <Shield className="h-3 w-3" /> Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                              <Activity className="h-3 w-3" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <LogOut className="h-3 w-3" /> Logout
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <LogIn className="h-3 w-3 text-muted-foreground" />
                            {formatDate(s.loginAt)}
                          </div>
                        </TableCell>
                        {mode === "all" && (
                          <TableCell className="text-xs whitespace-nowrap">
                            {s.logoutAt ? (
                              <div className="flex items-center gap-1">
                                <LogOut className="h-3 w-3 text-muted-foreground" />
                                {formatDate(s.logoutAt)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                            <span>{ua.browser} · {ua.os}</span>
                            <Badge variant="secondary" className="text-[10px]">{ua.device}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono">{s.ipAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRevokeId(s.id)}
                              title="Paksa Logout"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3 w-3" />
            Auto-refresh setiap 10 detik untuk update real-time
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Paksa logout pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Session akan ditandai sebagai logout. Pengguna tersebut tetap bisa login kembali dengan password.
              Catatan: cookie di browser mereka tetap ada, tapi dianggap expired oleh server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {revoking ? "Memproses..." : "Ya, Paksa Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
