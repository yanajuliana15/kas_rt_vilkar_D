"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Wallet,
  TrendingUp,
  Settings2,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Zap,
  Filter,
  Tags,
  Tag,
  AlertCircle,
  Loader2,
  FileDown,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api-client";
import { formatRupiah, todayISO, JENIS_TAGIHAN, type Tagihan, type Warga } from "@/lib/kas";

const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const BULAN_NAMA = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface TagihanStats {
  totalTagihan: number;
  totalNominal: number;
  lunasCount: number;
  belumBayarCount: number;
  totalLunas: number;
  totalBelum: number;
  perJenis: { jenis: string; count: number; nominal: number; lunas: number; belum: number }[];
}

export function TagihanSection({ onRefresh }: { onRefresh?: () => void }) {
  const [list, setList] = useState<Tagihan[]>([]);
  const [stats, setStats] = useState<TagihanStats | null>(null);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [filterJenis, setFilterJenis] = useState<string>("all");
  const [filterBulan, setFilterBulan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWarga, setFilterWarga] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");

  const [inputOpen, setInputOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ tagihan: Tagihan; action: "bayar" | "batal" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = useCallback(async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/kas/export-excel?from=${year}-01-01&to=${year}-12-31`);
      if (!res.ok) throw new Error("Gagal export. Coba lagi.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-kas-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export gagal: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }, [year]);

  const [form, setForm] = useState({
    wargaId: "",
    jenisTagihan: JENIS_TAGIHAN[0], // akan di-sync ke jenisList[0] saat openCreate
    nominal: "25000",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    keterangan: "",
  });

  const [bulkForm, setBulkForm] = useState({
    jenisTagihan: JENIS_TAGIHAN[0],
    nominal: "25000",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
    keterangan: "",
    status: "belum_bayar" as "belum_bayar" | "lunas",
    tanggalBayar: todayISO(),
  });

  // === Dynamic Jenis Tagihan (stored in Setting table) ===
  const [jenisList, setJenisList] = useState<string[]>(JENIS_TAGIHAN);
  const [newJenis, setNewJenis] = useState("");
  const [addingJenis, setAddingJenis] = useState(false);
  const [deletingJenis, setDeletingJenis] = useState<string | null>(null);
  const [jenisToDelete, setJenisToDelete] = useState<string | null>(null);
  const [jenisDialogOpen, setJenisDialogOpen] = useState(false);

  const fetchJenisList = useCallback(async () => {
    try {
      const res = await fetch("/api/setting?key=jenisTagihanList");
      const json = await res.json();
      const raw = json.data;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setJenisList(parsed.filter((x) => typeof x === "string"));
          }
        } catch {
          // fallback: keep default
        }
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchJenisList();
  }, [fetchJenisList]);

  async function handleAddJenis() {
    const trimmed = newJenis.trim();
    if (!trimmed) {
      toast({ title: "Validasi gagal", description: "Nama jenis tidak boleh kosong", variant: "destructive" });
      return;
    }
    if (jenisList.some((j) => j.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Sudah ada", description: `Jenis "${trimmed}" sudah ada di daftar`, variant: "destructive" });
      return;
    }
    setAddingJenis(true);
    try {
      const newList = [...jenisList, trimmed];
      const res = await authFetch("/api/setting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "jenisTagihanList", value: JSON.stringify(newList) }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal menyimpan");
      }
      setJenisList(newList);
      setNewJenis("");
      toast({ title: "Jenis ditambahkan", description: `"${trimmed}" berhasil ditambahkan` });
    } catch (err) {
      toast({
        title: "Gagal menambahkan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setAddingJenis(false);
    }
  }

  async function handleDeleteJenis() {
    if (!jenisToDelete) return;
    const target = jenisToDelete;
    // Cek apakah jenis sedang dipakai di tagihan mana pun
    const usedCount = list.filter((t) => t.jenisTagihan === target).length;
    if (usedCount > 0) {
      toast({
        title: "Tidak bisa hapus",
        description: `Jenis "${target}" sedang dipakai oleh ${usedCount} tagihan. Hapus atau ubah tagihan tersebut dulu.`,
        variant: "destructive",
      });
      setJenisToDelete(null);
      return;
    }
    setDeletingJenis(target);
    try {
      const newList = jenisList.filter((j) => j !== target);
      const res = await authFetch("/api/setting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "jenisTagihanList", value: JSON.stringify(newList) }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal menyimpan");
      }
      setJenisList(newList);
      // Kalau jenis aktif di filter/form dihapus, reset
      if (filterJenis === target) setFilterJenis("all");
      if (form.jenisTagihan === target) setForm({ ...form, jenisTagihan: newList[0] || "" });
      if (bulkForm.jenisTagihan === target) setBulkForm({ ...bulkForm, jenisTagihan: newList[0] || "" });
      toast({ title: "Jenis dihapus", description: `"${target}" dihapus dari daftar` });
      setJenisToDelete(null);
    } catch (err) {
      toast({
        title: "Gagal menghapus",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setDeletingJenis(null);
    }
  }

  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (filterJenis !== "all") params.set("jenis", filterJenis);
    if (filterBulan !== "all") params.set("month", filterBulan);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterWarga !== "all") params.set("wargaId", filterWarga);
    fetch(`/api/tagihan?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        setList(j.data || []);
        setStats(j.stats || null);
      })
      .finally(() => setLoading(false));
  }, [year, filterJenis, filterBulan, filterStatus, filterWarga]);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    setForm({
      wargaId: "",
      jenisTagihan: jenisList[0] || JENIS_TAGIHAN[0],
      nominal: "25000",
      bulan: String(new Date().getMonth() + 1),
      tahun: String(year),
      keterangan: "",
    });
    setEditingId(null);
    setInputOpen(true);
  }

  function openEdit(t: Tagihan) {
    setForm({
      wargaId: t.wargaId,
      jenisTagihan: t.jenisTagihan,
      nominal: String(t.nominal),
      bulan: String(t.bulan),
      tahun: String(t.tahun),
      keterangan: t.keterangan || "",
    });
    setEditingId(t.id);
    setInputOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wargaId || !form.jenisTagihan || !form.nominal || !form.bulan || !form.tahun) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(editingId ? `/api/tagihan/${editingId}` : "/api/tagihan", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nominal: Number(form.nominal),
          bulan: Number(form.bulan),
          tahun: Number(form.tahun),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({
        title: "Berhasil",
        description: editingId ? "Tagihan diperbarui" : "Tagihan ditambahkan",
      });
      setInputOpen(false);
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

  async function handleBulkGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkForm.jenisTagihan || !bulkForm.nominal || !bulkForm.bulan || !bulkForm.tahun) {
      toast({ title: "Validasi gagal", description: "Semua field wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/tagihan?bulk=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenisTagihan: bulkForm.jenisTagihan,
          nominal: Number(bulkForm.nominal),
          bulan: Number(bulkForm.bulan),
          tahun: Number(bulkForm.tahun),
          keterangan: bulkForm.keterangan,
          status: bulkForm.status,
          tanggalBayar: bulkForm.status === "lunas" ? bulkForm.tanggalBayar : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal generate");
      toast({
        title: "Berhasil",
        description: json.message,
      });
      setBulkOpen(false);
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

  async function handleAction() {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/tagihan/${actionTarget.tagihan.id}?action=${actionTarget.action}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses");
      toast({
        title: "Berhasil",
        description:
          actionTarget.action === "bayar"
            ? `Tagihan ${actionTarget.tagihan.warga?.namaLengkap} dilunasi (${formatRupiah(actionTarget.tagihan.nominal)})`
            : `Pembayaran tagihan ${actionTarget.tagihan.warga?.namaLengkap} dibatalkan`,
      });
      setActionTarget(null);
      fetchList();
      onRefresh?.();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await authFetch(`/api/tagihan/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal menghapus");
      }
      toast({ title: "Berhasil", description: "Tagihan dihapus" });
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

  // Build matrix data: warga x bulan untuk jenis terpilih (matrix view)
  const matrixJenis = filterJenis !== "all" ? filterJenis : (jenisList[0] || JENIS_TAGIHAN[0]);
  const matrixWarga = wargaList.filter((w) => w.status === "aktif");
  const matrixData = matrixWarga.map((w) => {
    const months: { month: number; tagihan?: Tagihan }[] = [];
    for (let i = 1; i <= 12; i++) {
      const t = list.find(
        (x) => x.wargaId === w.id && x.bulan === i && x.tahun === year && x.jenisTagihan === matrixJenis
      );
      months.push({ month: i, tagihan: t });
    }
    const paid = months.filter((m) => m.tagihan?.status === "lunas").length;
    const totalNominal = months.reduce((a, b) => a + (b.tagihan?.nominal || 0), 0);
    const totalLunas = months
      .filter((m) => m.tagihan?.status === "lunas")
      .reduce((a, b) => a + (b.tagihan?.nominal || 0), 0);
    return { warga: w, months, paid, totalNominal, totalLunas };
  });

  const collectionRate = stats && stats.totalNominal > 0
    ? Math.round((stats.totalLunas / stats.totalNominal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tagihan</CardTitle>
            <div className="rounded-full bg-violet-50 dark:bg-violet-950 p-2">
              <Receipt className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-violet-600">{stats?.totalTagihan || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatRupiah(stats?.totalNominal || 0)}</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Lunas</CardTitle>
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950 p-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{stats?.lunasCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatRupiah(stats?.totalLunas || 0)}</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-rose-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Belum Bayar</CardTitle>
            <div className="rounded-full bg-rose-50 dark:bg-rose-950 p-2">
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">{stats?.belumBayarCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatRupiah(stats?.totalBelum || 0)}</p>
          </CardContent>
        </Card>

        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tingkat Penagihan</CardTitle>
            <div className="rounded-full bg-cyan-50 dark:bg-cyan-950 p-2">
              <TrendingUp className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-cyan-600">{collectionRate}%</div>
            <Progress value={collectionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950 p-2">
                  <HandCoins className="h-4 w-4 text-violet-600" />
                </div>
                Data Tagihan Warga
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Input & kelola tagihan iuran warga per bulan. Tandai lunas → otomatis masuk Kas Vilkar Kosambi Blok D.
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting} className="gap-1.5">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setJenisDialogOpen(true)} className="gap-1.5">
                <Tags className="h-4 w-4" />
                <span className="hidden sm:inline">Kelola Jenis</span>
                <span className="sm:hidden">Jenis</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Massal</span>
                <span className="sm:hidden">Massal</span>
              </Button>
              <Button onClick={openCreate} className="gap-1.5 shadow-md bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                <Plus className="h-4 w-4" /> Input Tagihan
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
            <div className="space-y-1">
              <Label className="text-xs">Tahun</Label>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setYear((y) => y - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Input value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className="text-center h-9" />
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setYear((y) => y + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jenis</Label>
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {jenisList.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bulan</Label>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {BULAN_NAMA.map((b, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs">Warga</Label>
              <Select value={filterWarga} onValueChange={setFilterWarga}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {wargaList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.namaLengkap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex items-end">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "matrix" | "list")}>
                <TabsList className="h-9">
                  <TabsTrigger value="matrix" className="text-xs px-3">Matriks</TabsTrigger>
                  <TabsTrigger value="list" className="text-xs px-3">Daftar</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded shimmer" />
              ))}
            </div>
          ) : viewMode === "matrix" ? (
            /* MATRIX VIEW */
            matrixWarga.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Belum ada warga aktif. Tambahkan data warga terlebih dahulu.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Matriks untuk jenis:</span>
                  <Badge className="bg-violet-500 hover:bg-violet-600">{matrixJenis}</Badge>
                  <span className="text-muted-foreground">tahun {year}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 rounded bg-emerald-500 items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-muted-foreground">Lunas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 rounded bg-rose-100 dark:bg-rose-950 items-center justify-center">
                      <XCircle className="h-3 w-3 text-rose-500" />
                    </span>
                    <span className="text-muted-foreground">Belum Bayar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 rounded bg-muted" />
                    <span className="text-muted-foreground">Belum ada tagihan</span>
                  </div>
                </div>
                {/* MOBILE: card per warga, 12 bulan grid 4x3 */}
                <div className="md:hidden space-y-2">
                  {matrixData.map((row) => {
                    return (
                      <div
                        key={row.warga.id}
                        className="rounded-xl border bg-card p-3 shadow-sm"
                      >
                        {/* Header: nama + total */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate" title={row.warga.namaLengkap}>
                              {row.warga.namaLengkap}
                              {row.warga.kepalaKeluarga && (
                                <Badge variant="secondary" className="ml-1 text-[9px] py-0 align-middle">KK</Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {row.warga.noRumah ? `Rumah ${row.warga.noRumah}` : row.warga.nik}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-emerald-600 text-sm leading-none">{row.paid}/12</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{formatRupiah(row.totalLunas)}</div>
                          </div>
                        </div>
                        {/* 12 bulan grid 4x3 (3 row x 4 col) */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {row.months.map((mo) => {
                            const t = mo.tagihan;
                            const isCurrentMonth = new Date().getMonth() + 1 === mo.month && new Date().getFullYear() === year;
                            const label = BULAN_LABEL[mo.month - 1];
                            return (
                              <button
                                key={mo.month}
                                onClick={() => t && setActionTarget({ tagihan: t, action: t.status === "lunas" ? "batal" : "bayar" })}
                                disabled={!t}
                                title={
                                  t
                                    ? `${row.warga.namaLengkap} - ${BULAN_NAMA[mo.month - 1]} ${year} - ${
                                        t.status === "lunas" ? `Lunas (${formatRupiah(t.nominal)}). Klik untuk batalkan.` : `Belum bayar (${formatRupiah(t.nominal)}). Klik untuk lunasi.`
                                      }`
                                    : `${row.warga.namaLengkap} - ${BULAN_NAMA[mo.month - 1]} ${year} - Belum ada tagihan`
                                }
                                className={`flex flex-col items-center justify-center aspect-square rounded-lg transition-all text-[10px] font-medium ${
                                  t
                                    ? t.status === "lunas"
                                      ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-sm"
                                      : isCurrentMonth
                                      ? "bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 ring-1 ring-rose-300"
                                      : "bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-500"
                                    : "bg-muted/50 text-muted-foreground cursor-default"
                                }`}
                              >
                                <span className="opacity-80">{label}</span>
                                {t ? (
                                  t.status === "lunas" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 mt-0.5" />
                                  )
                                ) : (
                                  <span className="text-[10px] mt-0.5">—</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP: keep horizontal scroll table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border scrollbar-thin">
                  <table className="w-full text-sm border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="sticky left-0 z-20 bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground min-w-[160px]">
                          Warga
                        </th>
                        {BULAN_LABEL.map((m, i) => (
                          <th key={i} className="px-2 py-2 text-center font-medium text-muted-foreground min-w-[48px]">
                            {m}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground bg-muted/70 sticky right-0 z-20">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.map((row, idx) => {
                        const currentMonth = new Date().getMonth() + 1;
                        const isCurrentYear = year === new Date().getFullYear();
                        return (
                          <tr key={row.warga.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="sticky left-0 z-10 px-3 py-2 bg-inherit border-r">
                              <div className="font-medium truncate max-w-[150px]" title={row.warga.namaLengkap}>
                                {row.warga.namaLengkap}
                                {row.warga.kepalaKeluarga && (
                                  <Badge variant="secondary" className="ml-1 text-[9px] py-0">KK</Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {row.warga.noRumah ? `Rumah ${row.warga.noRumah}` : row.warga.nik}
                              </div>
                            </td>
                            {row.months.map((mo) => {
                              const t = mo.tagihan;
                              const isCurrent = isCurrentYear && mo.month === currentMonth;
                              return (
                                <td key={mo.month} className="p-1 text-center">
                                  {t ? (
                                    <button
                                      onClick={() => setActionTarget({ tagihan: t, action: t.status === "lunas" ? "batal" : "bayar" })}
                                      title={`${row.warga.namaLengkap} - ${BULAN_NAMA[mo.month - 1]} ${year} - ${t.status === "lunas" ? `Lunas (${formatRupiah(t.nominal)}). Klik untuk batalkan.` : `Belum bayar (${formatRupiah(t.nominal)}). Klik untuk lunasi.`}`}
                                      className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-all ${
                                        t.status === "lunas"
                                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                                          : isCurrent
                                          ? "bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-500 ring-1 ring-rose-300"
                                          : "bg-rose-100 dark:bg-rose-950 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-500"
                                      }`}
                                    >
                                      {t.status === "lunas" ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="inline-flex h-8 w-8 rounded-md bg-muted/40 items-center justify-center text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 text-center sticky right-0 z-10 bg-inherit border-l">
                              <div className="font-bold text-emerald-600">{row.paid}/12</div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatRupiah(row.totalLunas)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : (
            /* LIST VIEW */
            list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Belum ada tagihan. Klik "Input Tagihan" atau "Generate Massal" untuk memulai.
              </div>
            ) : (
              <>
              {/* MOBILE: card per tagihan */}
              <div className="md:hidden space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {list.map((t) => (
                  <div key={t.id} className="rounded-xl border bg-card p-3 shadow-sm">
                    {/* Header: warga + status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{t.warga?.namaLengkap || "—"}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{t.warga?.nik}</div>
                      </div>
                      {t.status === "lunas" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Lunas
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 shrink-0">
                          <XCircle className="h-3 w-3" /> Belum
                        </Badge>
                      )}
                    </div>

                    {/* Body: jenis + periode */}
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <Badge variant="outline" className="text-[11px]">{t.jenisTagihan}</Badge>
                      <span className="text-muted-foreground">{BULAN_NAMA[t.bulan - 1]} {t.tahun}</span>
                    </div>

                    {/* Nominal (large) */}
                    <div className="text-lg font-bold mb-3">{formatRupiah(t.nominal)}</div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      {t.status === "belum_bayar" ? (
                        <Button
                          size="sm"
                          onClick={() => setActionTarget({ tagihan: t, action: "bayar" })}
                          className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600 h-9"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Lunaskan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionTarget({ tagihan: t, action: "batal" })}
                          className="flex-1 gap-1.5 text-amber-600 h-9"
                        >
                          <XCircle className="h-4 w-4" /> Batalkan
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(t)}
                        disabled={t.status === "lunas"}
                        className="h-9 px-3"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteId(t.id)}
                        className="h-9 px-3 text-red-600 hover:text-red-700"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP: keep table */}
              <div className="hidden md:block max-h-[55vh] overflow-y-auto rounded-md border scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">No</TableHead>
                      <TableHead>Warga</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((t, i) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.warga?.namaLengkap || "—"}</div>
                          <div className="text-xs text-muted-foreground">{t.warga?.nik}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{t.jenisTagihan}</Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {BULAN_NAMA[t.bulan - 1]} {t.tahun}
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          {formatRupiah(t.nominal)}
                        </TableCell>
                        <TableCell>
                          {t.status === "lunas" ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Lunas
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Belum
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {t.status === "belum_bayar" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setActionTarget({ tagihan: t, action: "bayar" })}
                              title="Tandai lunas"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setActionTarget({ tagihan: t, action: "batal" })}
                              title="Batalkan pembayaran"
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit" disabled={t.status === "lunas"}>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )
          )}

          {/* Per-jenis breakdown */}
          {stats && stats.perJenis.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.perJenis.map((p) => {
                const rate = p.nominal > 0 ? Math.round((p.lunas / p.nominal) * 100) : 0;
                return (
                  <motion.div
                    key={p.jenis}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border p-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm">{p.jenis}</span>
                      <Badge variant="outline" className="text-[10px]">{p.count} tagihan</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Terkumpul {rate}%</span>
                      <span className="font-semibold text-emerald-600">{formatRupiah(p.lunas)}</span>
                    </div>
                    <Progress value={rate} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Belum: {formatRupiah(p.belum)} dari {formatRupiah(p.nominal)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Kelola Jenis Tagihan */}
      <Dialog open={jenisDialogOpen} onOpenChange={setJenisDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950 p-2">
                <Tags className="h-4 w-4 text-violet-600" />
              </div>
              Kelola Jenis Tagihan
            </DialogTitle>
            <DialogDescription>
              Tambah jenis tagihan custom (mis: "Iuran Keagamaan", "Iuran Acara HUT RI"). Jenis yang sedang dipakai tagihan tidak bisa dihapus.
            </DialogDescription>
          </DialogHeader>

          {/* Form tambah */}
          <div className="flex gap-2">
            <Input
              placeholder="Nama jenis tagihan baru..."
              value={newJenis}
              onChange={(e) => setNewJenis(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !addingJenis && newJenis.trim()) handleAddJenis(); }}
              className="flex-1 h-10"
              maxLength={50}
              disabled={addingJenis}
              autoFocus
            />
            <Button
              onClick={handleAddJenis}
              disabled={addingJenis || !newJenis.trim()}
              className="gap-1.5 shadow-md bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 h-10 px-4 shrink-0"
            >
              {addingJenis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Tambah</span>
            </Button>
          </div>

          {/* List of jenis */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              {jenisList.length} jenis tagihan terdaftar
            </div>
            {jenisList.map((j) => {
              const usedCount = list.filter((t) => t.jenisTagihan === j).length;
              return (
                <div
                  key={j}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{j}</span>
                    </div>
                    {usedCount > 0 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Dipakai {usedCount} tagihan
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => setJenisToDelete(j)}
                    disabled={deletingJenis === j}
                    title={usedCount > 0 ? `Sedang dipakai ${usedCount} tagihan — tidak bisa hapus` : `Hapus "${j}"`}
                    aria-label={`Hapus jenis ${j}`}
                  >
                    {deletingJenis === j ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Perubahan disimpan otomatis ke database dan langsung tersinkron ke dropdown di form Input Tagihan, Generate Massal, dan Filter. Jenis yang sudah dipakai tagihan tidak bisa dihapus — hapus/ubah tagihan terkait dulu.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus Jenis */}
      <AlertDialog open={!!jenisToDelete} onOpenChange={(o) => !o && setJenisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jenis Tagihan?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus jenis <strong className="text-foreground">&quot;{jenisToDelete}&quot;</strong>?
              Tagihan yang sudah ada dengan jenis ini TIDAK akan terhapus — hanya pilihan di dropdown yang dihilangkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJenis}
              disabled={!!deletingJenis}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingJenis ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Input Dialog */}
      <Dialog open={inputOpen} onOpenChange={setInputOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Tagihan" : "Input Tagihan Warga"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Ubah data tagihan. Tagihan yang sudah lunas tidak bisa diubah."
                : "Buat tagihan iuran untuk warga. Nominal bisa custom per warga."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wargaId">Warga *</Label>
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
                <Label htmlFor="jenisTagihan">Jenis Tagihan *</Label>
                <Select value={form.jenisTagihan} onValueChange={(v) => setForm({ ...form, jenisTagihan: v })}>
                  <SelectTrigger id="jenisTagihan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {jenisList.map((j) => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominal">Nominal (Rp) *</Label>
                <Input
                  id="nominal"
                  type="number"
                  min="0"
                  value={form.nominal}
                  onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulan">Bulan *</Label>
                <Select value={form.bulan} onValueChange={(v) => setForm({ ...form, bulan: v })}>
                  <SelectTrigger id="bulan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BULAN_NAMA.map((b, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tahun">Tahun *</Label>
                <Input
                  id="tahun"
                  type="number"
                  min="2020"
                  max="2100"
                  value={form.tahun}
                  onChange={(e) => setForm({ ...form, tahun: e.target.value })}
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
                placeholder="Catatan tambahan..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInputOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan" : "Tambah Tagihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Tagihan Massal</DialogTitle>
            <DialogDescription>
              Buat tagihan untuk semua warga aktif sekaligus. Warga yang sudah punya tagihan jenis+bulan sama akan dilewati.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkJenis">Jenis Tagihan *</Label>
                <Select value={bulkForm.jenisTagihan} onValueChange={(v) => setBulkForm({ ...bulkForm, jenisTagihan: v })}>
                  <SelectTrigger id="bulkJenis"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {jenisList.map((j) => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkNominal">Nominal (Rp) *</Label>
                <Input
                  id="bulkNominal"
                  type="number"
                  min="0"
                  value={bulkForm.nominal}
                  onChange={(e) => setBulkForm({ ...bulkForm, nominal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkBulan">Bulan *</Label>
                <Select value={bulkForm.bulan} onValueChange={(v) => setBulkForm({ ...bulkForm, bulan: v })}>
                  <SelectTrigger id="bulkBulan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BULAN_NAMA.map((b, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkTahun">Tahun *</Label>
                <Input
                  id="bulkTahun"
                  type="number"
                  min="2020"
                  max="2100"
                  value={bulkForm.tahun}
                  onChange={(e) => setBulkForm({ ...bulkForm, tahun: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkKeterangan">Keterangan (opsional)</Label>
              <Textarea
                id="bulkKeterangan"
                value={bulkForm.keterangan}
                onChange={(e) => setBulkForm({ ...bulkForm, keterangan: e.target.value })}
                rows={2}
                placeholder="Akan diterapkan ke semua tagihan yang dibuat"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkStatus">Status Tagihan *</Label>
                <Select
                  value={bulkForm.status}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, status: v as "belum_bayar" | "lunas" })}
                >
                  <SelectTrigger id="bulkStatus"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                    <SelectItem value="lunas">Sudah Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {bulkForm.status === "lunas" && (
                <div className="space-y-2">
                  <Label htmlFor="bulkTanggalBayar">Tanggal Pembayaran *</Label>
                  <Input
                    id="bulkTanggalBayar"
                    type="date"
                    value={bulkForm.tanggalBayar}
                    onChange={(e) => setBulkForm({ ...bulkForm, tanggalBayar: e.target.value })}
                  />
                </div>
              )}
            </div>
            {bulkForm.status === "lunas" ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                Akan membuat <span className="font-bold">{wargaList.filter(w => w.status === "aktif").length} tagihan SUDAH LUNAS</span> dengan nominal {formatRupiah(Number(bulkForm.nominal) || 0)}/warga.
                Pembayaran otomatis masuk ke Kas Vilkar Kosambi Blok D (kategori: {bulkForm.jenisTagihan}).
              </div>
            ) : (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                <XCircle className="h-3.5 w-3.5 inline mr-1" />
                Akan membuat <span className="font-bold">{wargaList.filter(w => w.status === "aktif").length} tagihan BELUM BAYAR</span> dengan nominal {formatRupiah(Number(bulkForm.nominal) || 0)}/warga. Tandai lunas nanti via matriks/daftar.
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                <Zap className="h-4 w-4" />
                {saving ? "Generating..." : "Generate Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action confirm (bayar/batal) */}
      <AlertDialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === "bayar" ? "Tandai Tagihan Lunas?" : "Batalkan Pembayaran?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget && (
                <>
                  {actionTarget.action === "bayar" ? (
                    <>
                      Catat pembayaran tagihan <span className="font-semibold">{actionTarget.tagihan.warga?.namaLengkap}</span> —{" "}
                      <span className="font-semibold">{actionTarget.tagihan.jenisTagihan}</span> periode{" "}
                      <span className="font-semibold">{BULAN_NAMA[actionTarget.tagihan.bulan - 1]} {actionTarget.tagihan.tahun}</span>{" "}
                      sebesar <span className="font-semibold">{formatRupiah(actionTarget.tagihan.nominal)}</span>.
                      <br />Transaksi pemasukan akan otomatis dibuat di Kas Vilkar Kosambi Blok D.
                    </>
                  ) : (
                    <>
                      Batalkan pembayaran tagihan <span className="font-semibold">{actionTarget.tagihan.warga?.namaLengkap}</span> —{" "}
                      <span className="font-semibold">{actionTarget.tagihan.jenisTagihan}</span> periode{" "}
                      <span className="font-semibold">{BULAN_NAMA[actionTarget.tagihan.bulan - 1]} {actionTarget.tagihan.tahun}</span>?
                      <br />Transaksi kas terkait akan dihapus.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={actionTarget?.action === "bayar" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
            >
              {actionLoading ? "Memproses..." : actionTarget?.action === "bayar" ? "Ya, Lunasi" : "Ya, Batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tagihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tagihan akan dihapus permanen. Jika sudah lunas, transaksi kas terkait juga akan dihapus.
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
