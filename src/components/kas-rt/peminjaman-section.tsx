"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HandCoins,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  Pencil,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api-client";
import { formatRupiah, formatDate, todayISO, type Warga } from "@/lib/kas";

interface Pembayaran {
  id: string;
  tanggal: string;
  jumlah: number;
  keterangan: string | null;
}

interface Peminjaman {
  id: string;
  wargaId: string;
  jumlah: number;
  bunga: number;
  tanggalPinjam: string;
  tanggalJatuhTempo: string;
  totalBayar: number;
  status: string;
  keterangan: string | null;
  createdAt: string;
  warga?: { id: string; namaLengkap: string; nik: string; noRumah: string | null } | null;
  pembayaran?: Pembayaran[];
}

interface PeminjamanStats {
  total: number;
  aktif: number;
  lunas: number;
  totalDipinjam: number;
  totalBunga: number;
  totalBayar: number;
  sisaTagihan: number;
}

export function PeminjamanSection({ isAdmin = true }: { isAdmin?: boolean }) {
  const [list, setList] = useState<Peminjaman[]>([]);
  const [stats, setStats] = useState<PeminjamanStats | null>(null);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [inputOpen, setInputOpen] = useState(false);
  const [bayarTarget, setBayarTarget] = useState<Peminjaman | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    wargaId: "",
    jumlah: "",
    bunga: "0",
    tanggalPinjam: todayISO(),
    tanggalJatuhTempo: "",
    keterangan: "",
    cairkan: true,
  });

  const [bayarForm, setBayarForm] = useState({
    tanggal: todayISO(),
    jumlah: "",
    keterangan: "",
  });

  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    fetch(`/api/peminjaman?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        setList(j.data || []);
        setStats(j.stats || null);
      })
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    // default jatuh tempo = 3 bulan dari sekarang
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setForm({
      wargaId: "",
      jumlah: "",
      bunga: "0",
      tanggalPinjam: todayISO(),
      tanggalJatuhTempo: d.toISOString().slice(0, 10),
      keterangan: "",
      cairkan: true,
    });
    setInputOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wargaId || !form.jumlah || !form.tanggalPinjam || !form.tanggalJatuhTempo) {
      toast({ title: "Validasi gagal", description: "Warga, jumlah, tanggal pinjam & jatuh tempo wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/peminjaman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jumlah: Number(form.jumlah),
          bunga: Number(form.bunga),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: "Peminjaman dicatat" + (form.cairkan ? " & dana dicairkan ke kas" : "") });
      setInputOpen(false);
      fetchList();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleBayar(e: React.FormEvent) {
    e.preventDefault();
    if (!bayarTarget) return;
    if (!bayarForm.tanggal || !bayarForm.jumlah) {
      toast({ title: "Validasi gagal", description: "Tanggal & jumlah wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`/api/peminjaman/${bayarTarget.id}/bayar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: bayarForm.tanggal,
          jumlah: Number(bayarForm.jumlah),
          keterangan: bayarForm.keterangan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({
        title: "Berhasil",
        description: json.data.status === "lunas" ? "Pinjaman LUNAS!" : "Pembayaran dicatat",
      });
      setBayarTarget(null);
      setBayarForm({ tanggal: todayISO(), jumlah: "", keterangan: "" });
      fetchList();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await authFetch(`/api/peminjaman/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal menghapus");
      }
      toast({ title: "Berhasil", description: "Peminjaman dihapus" });
      setDeleteId(null);
      fetchList();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  const filtered = list;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-rose-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Dipinjam</CardTitle>
            <div className="rounded-full bg-rose-50 dark:bg-rose-950 p-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">{formatRupiah(stats?.totalDipinjam || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.total || 0} pinjaman</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Dibayar</CardTitle>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatRupiah(stats?.totalBayar || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">sudah kembali ke kas</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sisa Tagihan</CardTitle>
            <div className="rounded-full bg-amber-50 dark:bg-amber-950 p-2">
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatRupiah(stats?.sisaTagihan || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.aktif || 0} pinjaman aktif</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Lunas</CardTitle>
            <div className="rounded-full bg-violet-50 dark:bg-violet-950 p-2">
              <CheckCircle2 className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-violet-600">{stats?.lunas || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">pinjaman selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950 p-2">
                  <HandCoins className="h-4 w-4 text-rose-600" />
                </div>
                Data Peminjaman Uang Warga
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Catat pinjaman warga ke kas Vilkar Kosambi Blok D. Pencairan otomatis keluar dari kas, pembayaran otomatis masuk kas.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="jatuh_tempo">Jatuh Tempo</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate} className="gap-1.5 shadow-md bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700">
                <Plus className="h-4 w-4" /> Input Pinjaman
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HandCoins className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada data peminjaman.
              Klik "Input Pinjaman" untuk mencatat pinjaman baru.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((p, idx) => {
                const totalHarus = p.jumlah + p.bunga;
                const sisa = Math.max(0, totalHarus - p.totalBayar);
                const progress = totalHarus > 0 ? Math.min(100, Math.round((p.totalBayar / totalHarus) * 100)) : 0;
                const isLunas = p.status === "lunas";
                const isJatuhTempo = p.status === "jatuh_tempo";
                const isOverdue = !isLunas && new Date(p.tanggalJatuhTempo) < new Date();
                const StatusIcon = isLunas ? CheckCircle2 : isJatuhTempo ? AlertTriangle : Clock;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card className={`card-lift shadow-md border-0 border-l-4 ${isLunas ? "border-l-emerald-500" : isOverdue ? "border-l-red-500" : "border-l-amber-500"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`rounded-lg p-2 ${isLunas ? "bg-emerald-50 dark:bg-emerald-950" : isOverdue ? "bg-red-50 dark:bg-red-950" : "bg-amber-50 dark:bg-amber-950"}`}>
                              <StatusIcon className={`h-5 w-5 ${isLunas ? "text-emerald-600" : isOverdue ? "text-red-600" : "text-amber-600"}`} />
                            </div>
                            <div>
                              <div className="font-semibold">{p.warga?.namaLengkap || "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.warga?.noRumah ? `Rumah ${p.warga.noRumah}` : p.warga?.nik}
                              </div>
                            </div>
                          </div>
                          <Badge className={
                            isLunas ? "bg-emerald-500 hover:bg-emerald-600" :
                            isOverdue ? "bg-red-500 hover:bg-red-600" :
                            "bg-amber-500 hover:bg-amber-600"
                          }>
                            {isLunas ? "Lunas" : isOverdue ? "Terlambat" : p.status === "jatuh_tempo" ? "Jatuh Tempo" : "Aktif"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Pokok Pinjaman</div>
                            <div className="font-bold text-rose-600">{formatRupiah(p.jumlah)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Bunga</div>
                            <div className="font-bold">{formatRupiah(p.bunga)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Sudah Dibayar</div>
                            <div className="font-bold text-emerald-600">{formatRupiah(p.totalBayar)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Sisa</div>
                            <div className="font-bold text-amber-600">{formatRupiah(sisa)}</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress Pembayaran</span>
                            <span className="font-bold">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Pinjam: {formatDate(p.tanggalPinjam)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Jatuh Tempo: {formatDate(p.tanggalJatuhTempo)}
                          </span>
                        </div>

                        {p.keterangan && (
                          <div className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.keterangan}</div>
                        )}

                        {p.pembayaran && p.pembayaran.length > 0 && (
                          <details className="mb-3">
                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                              Riwayat pembayaran ({p.pembayaran.length})
                            </summary>
                            <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                              {p.pembayaran.map((pb) => (
                                <div key={pb.id} className="text-xs flex justify-between bg-muted/40 rounded px-2 py-1">
                                  <span>{formatDate(pb.tanggal)}</span>
                                  <span className="font-semibold text-emerald-600">{formatRupiah(pb.jumlah)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        <div className="flex gap-1 pt-3 border-t">
                          {!isLunas && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 flex-1"
                              onClick={() => {
                                setBayarTarget(p);
                                setBayarForm({ tanggal: todayISO(), jumlah: String(sisa), keterangan: "" });
                              }}
                            >
                              <HandCoins className="h-3.5 w-3.5" /> Catat Pembayaran
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteId(p.id)}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Dialog */}
      <Dialog open={inputOpen} onOpenChange={setInputOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Peminjaman Uang</DialogTitle>
            <DialogDescription>
              Catat pinjaman warga dari kas Vilkar Kosambi Blok D. Saat disimpan, dana otomatis keluar dari kas (pencairan).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wargaId">Warga Peminjam *</Label>
              <Select value={form.wargaId} onValueChange={(v) => setForm({ ...form, wargaId: v })}>
                <SelectTrigger id="wargaId"><SelectValue placeholder="Pilih warga" /></SelectTrigger>
                <SelectContent>
                  {wargaList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.namaLengkap} {w.noRumah ? `(Rumah ${w.noRumah})` : `(${w.nik})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah Pinjaman (Rp) *</Label>
                <Input
                  id="jumlah"
                  type="number"
                  min="0"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bunga">Bunga (Rp)</Label>
                <Input
                  id="bunga"
                  type="number"
                  min="0"
                  value={form.bunga}
                  onChange={(e) => setForm({ ...form, bunga: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalPinjam">Tanggal Pinjam *</Label>
                <Input
                  id="tanggalPinjam"
                  type="date"
                  value={form.tanggalPinjam}
                  onChange={(e) => setForm({ ...form, tanggalPinjam: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalJatuhTempo">Jatuh Tempo *</Label>
                <Input
                  id="tanggalJatuhTempo"
                  type="date"
                  value={form.tanggalJatuhTempo}
                  onChange={(e) => setForm({ ...form, tanggalJatuhTempo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                rows={2}
                placeholder="Keperluan pinjaman, jaminan, dll..."
              />
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              <TrendingDown className="h-3.5 w-3.5 inline mr-1" />
              Saat disimpan, <strong>{form.jumlah ? formatRupiah(Number(form.jumlah)) : "Rp 0"}</strong> akan otomatis dicatat sebagai pengeluaran kas Vilkar Kosambi Blok D (pencairan pinjaman).
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInputOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Catat Pinjaman"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bayar Dialog */}
      <Dialog open={!!bayarTarget} onOpenChange={(o) => !o && setBayarTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Pinjaman</DialogTitle>
            <DialogDescription>
              {bayarTarget && (
                <>
                  <strong>{bayarTarget.warga?.namaLengkap}</strong> — Sisa:{" "}
                  <strong className="text-amber-600">
                    {formatRupiah(Math.max(0, bayarTarget.jumlah + bayarTarget.bunga - bayarTarget.totalBayar))}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBayar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bayarTanggal">Tanggal *</Label>
                <Input
                  id="bayarTanggal"
                  type="date"
                  value={bayarForm.tanggal}
                  onChange={(e) => setBayarForm({ ...bayarForm, tanggal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bayarJumlah">Jumlah (Rp) *</Label>
                <Input
                  id="bayarJumlah"
                  type="number"
                  min="0"
                  value={bayarForm.jumlah}
                  onChange={(e) => setBayarForm({ ...bayarForm, jumlah: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bayarKet">Keterangan</Label>
              <Textarea
                id="bayarKet"
                value={bayarForm.keterangan}
                onChange={(e) => setBayarForm({ ...bayarForm, keterangan: e.target.value })}
                rows={2}
                placeholder="Angsuran ke-, pelunasan, dll..."
              />
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
              Pembayaran akan otomatis masuk sebagai pemasukan kas Vilkar Kosambi Blok D (kategori: Pengembalian Pinjaman).
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBayarTarget(null)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                <HandCoins className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Catat Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus peminjaman ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Peminjaman, semua riwayat pembayaran, dan transaksi kas terkait (pencairan + pembayaran) akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
