"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  formatRupiah,
  formatDate,
  todayISO,
  KATEGORI_KAS,
  type KasTransaction,
  type Warga,
} from "@/lib/kas";
import { ReadOnlyBadge } from "@/components/kas-rt/role-banner";

// Kategori yang terkait peminjaman — di-hide untuk guest
const PEMINJAMAN_KATEGORI = ["Peminjaman", "Pengembalian Pinjaman"];

const emptyForm = {
  tanggal: todayISO(),
  jenis: "masuk" as "masuk" | "keluar",
  kategori: KATEGORI_KAS[0],
  jumlah: "",
  keterangan: "",
  buktiUrl: "",
  wargaId: "",
};

export function KasSection({ onRefresh, isAdmin = false }: { onRefresh?: () => void; isAdmin?: boolean }) {
  const [list, setList] = useState<KasTransaction[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterJenis !== "all") params.set("jenis", filterJenis);
    if (filterKategori !== "all") params.set("kategori", filterKategori);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/kas?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoading(false));
  }, [filterJenis, filterKategori, filterFrom, filterTo, search]);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchList, 300);
    return () => clearTimeout(t);
  }, [fetchList]);

  // Guest: lihat semua transaksi (termasuk peminjaman supaya saldo akurat),
  // tapi nama peminjam akan di-hide di kolom Warga & Keterangan (privasi)
  const displayList = list;

  const totalMasuk = displayList.filter((t) => t.jenis === "masuk").reduce((a, b) => a + b.jumlah, 0);
  const totalKeluar = displayList.filter((t) => t.jenis === "keluar").reduce((a, b) => a + b.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;

  function openCreate() {
    setForm({ ...emptyForm, tanggal: todayISO() });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(t: KasTransaction) {
    setForm({
      tanggal: t.tanggal,
      jenis: t.jenis,
      kategori: t.kategori,
      jumlah: String(t.jumlah),
      keterangan: t.keterangan || "",
      buktiUrl: t.buktiUrl || "",
      wargaId: t.wargaId || "",
    });
    setEditingId(t.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tanggal || !form.jenis || !form.kategori || !form.jumlah) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    if (Number(form.jumlah) <= 0) {
      toast({ title: "Validasi gagal", description: "Jumlah harus > 0", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(editingId ? `/api/kas/${editingId}` : "/api/kas", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          jumlah: Number(form.jumlah),
          wargaId: form.wargaId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: editingId ? "Transaksi diperbarui" : "Transaksi ditambahkan" });
      setDialogOpen(false);
      fetchList();
      onRefresh?.();
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
      const res = await authFetch(`/api/kas/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Berhasil", description: "Transaksi dihapus" });
      setDeleteId(null);
      fetchList();
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  function handleExportExcel() {
    const params = new URLSearchParams();
    if (filterJenis !== "all") params.set("jenis", filterJenis);
    if (filterKategori !== "all") params.set("kategori", filterKategori);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    window.open(`/api/kas/export-excel?${params.toString()}`, "_blank");
  }

  function resetFilter() {
    setFilterJenis("all");
    setFilterKategori("all");
    setFilterFrom("");
    setFilterTo("");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Masuk (Filter)</CardTitle>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatRupiah(totalMasuk)}</div>
          </CardContent>
        </Card>
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-rose-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Keluar (Filter)</CardTitle>
            <div className="rounded-full bg-rose-50 dark:bg-rose-950 p-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">{formatRupiah(totalKeluar)}</div>
          </CardContent>
        </Card>
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo (Filter)</CardTitle>
            <div className="rounded-full bg-amber-50 dark:bg-amber-950 p-2">
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${saldo >= 0 ? "text-amber-600" : "text-rose-600"}`}>
              {formatRupiah(saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & actions */}
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jenis</Label>
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={filterKategori} onValueChange={setFilterKategori}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {KATEGORI_KAS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">Cari Keterangan</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={resetFilter} title="Reset filter">
                  ↺
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="gap-2 shadow-sm bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
              title="Export laporan ke Excel (siap pakai, multi-sheet)"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            {isAdmin && (
              <Button onClick={openCreate} className="gap-2 shadow-md bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                <Plus className="h-4 w-4" /> Tambah Transaksi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Transaksi ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada transaksi. Klik "Tambah Transaksi" untuk memulai.
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Warga</TableHead>
                    {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayList.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(t.tanggal)}</TableCell>
                      <TableCell>
                        {t.jenis === "masuk" ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                            <ArrowUpCircle className="h-3 w-3" /> Masuk
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 hover:bg-red-600 gap-1">
                            <ArrowDownCircle className="h-3 w-3" /> Keluar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.kategori}</TableCell>
                      <TableCell className={`text-right font-semibold whitespace-nowrap ${t.jenis === "masuk" ? "text-emerald-600" : "text-red-600"}`}>
                        {t.jenis === "masuk" ? "+" : "-"} {formatRupiah(t.jumlah)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={t.keterangan || ""}>
                        {/* Guest: sanitize keterangan transaksi peminjaman (hide nama peminjam) */}
                        {!isAdmin && PEMINJAMAN_KATEGORI.includes(t.kategori) && t.keterangan
                          ? t.keterangan.replace(/- .+$/, "- Warga").replace(/^.+ - /, "Warga - ")
                          : (t.keterangan || "-")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {/* Guest: hide nama warga untuk transaksi peminjaman (privasi) */}
                        {!isAdmin && PEMINJAMAN_KATEGORI.includes(t.kategori)
                          ? <span className="italic opacity-60">—</span>
                          : t.warga ? t.warga.namaLengkap : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(t.id)}
                            title="Hapus"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Transaksi" : "Tambah Transaksi Kas"}</DialogTitle>
            <DialogDescription>
              Catat uang masuk atau keluar kas Vilkar Kosambi Blok D.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal *</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenis">Jenis *</Label>
                <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v as "masuk" | "keluar" })}>
                  <SelectTrigger id="jenis"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masuk">Uang Masuk</SelectItem>
                    <SelectItem value="keluar">Uang Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori *</Label>
                <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                  <SelectTrigger id="kategori"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KATEGORI_KAS.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah (Rp) *</Label>
                <Input
                  id="jumlah"
                  type="number"
                  min="0"
                  step="any"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="wargaId">Terkait Warga (opsional)</Label>
                <Select value={form.wargaId} onValueChange={(v) => setForm({ ...form, wargaId: v === "none" ? "" : v })}>
                  <SelectTrigger id="wargaId"><SelectValue placeholder="Pilih warga (untuk iuran)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Tidak terkait --</SelectItem>
                    {wargaList.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.namaLengkap} ({w.nik})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={3}
                  placeholder="Keterangan transaksi..."
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="buktiUrl">URL Bukti (opsional)</Label>
                <Input
                  id="buktiUrl"
                  value={form.buktiUrl}
                  onChange={(e) => setForm({ ...form, buktiUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi yang dihapus tidak dapat dikembalikan.
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
