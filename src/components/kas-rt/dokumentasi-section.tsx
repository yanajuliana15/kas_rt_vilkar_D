"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api-client";
import { formatDate, todayISO, type Dokumentasi, type Warga } from "@/lib/kas";
import { ReadOnlyBadge } from "@/components/kas-rt/role-banner";

const emptyForm = {
  wargaId: "",
  judul: "",
  tipe: "planning" as "planning" | "hasil",
  tanggal: todayISO(),
  deskripsi: "",
  targetDate: "",
  status: "berjalan",
  progress: 0,
};

function statusConfig(status: string) {
  switch (status) {
    case "selesai":
      return { label: "Selesai", color: "bg-emerald-500 hover:bg-emerald-600", icon: CheckCircle2 };
    case "berjalan":
      return { label: "Berjalan", color: "bg-blue-500 hover:bg-blue-600", icon: Clock };
    case "tertunda":
      return { label: "Tertunda", color: "bg-amber-500 hover:bg-amber-600", icon: AlertCircle };
    default:
      return { label: status, color: "bg-gray-500", icon: Clock };
  }
}

export function DokumentasiSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const [list, setList] = useState<Dokumentasi[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "planning" | "hasil">("all");
  const [filterWarga, setFilterWarga] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("tipe", activeTab);
    if (filterWarga !== "all") params.set("wargaId", filterWarga);
    fetch(`/api/dokumentasi?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoading(false));
  }, [activeTab, filterWarga]);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    setForm({ ...emptyForm, tanggal: todayISO() });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(d: Dokumentasi) {
    setForm({
      wargaId: d.wargaId,
      judul: d.judul,
      tipe: d.tipe,
      tanggal: d.tanggal,
      deskripsi: d.deskripsi,
      targetDate: d.targetDate || "",
      status: d.status,
      progress: d.progress,
    });
    setEditingId(d.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wargaId || !form.judul || !form.tanggal || !form.deskripsi) {
      toast({ title: "Validasi gagal", description: "Warga, judul, tanggal, dan deskripsi wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(editingId ? `/api/dokumentasi/${editingId}` : "/api/dokumentasi", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, targetDate: form.targetDate || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: editingId ? "Dokumentasi diperbarui" : "Dokumentasi ditambahkan" });
      setDialogOpen(false);
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
      const res = await authFetch(`/api/dokumentasi/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Berhasil", description: "Dokumentasi dihapus" });
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
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950 p-2">
                  <Target className="h-4 w-4 text-rose-600" />
                </div>
                Dokumentasi Warga
                <ReadOnlyBadge isAdmin={isAdmin} />
              </CardTitle>
              <CardDescription className="text-sm">
                Perencanaan (planning) ke depan & hasil yang sudah dicapai
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={openCreate} className="gap-2 shadow-md bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700">
                <Plus className="h-4 w-4" /> Tambah Dokumentasi
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "planning" | "hasil")}>
              <TabsList>
                <TabsTrigger value="all">Semua</TabsTrigger>
                <TabsTrigger value="planning" className="gap-1">
                  <Target className="h-3.5 w-3.5" /> Planning
                </TabsTrigger>
                <TabsTrigger value="hasil" className="gap-1">
                  <Award className="h-3.5 w-3.5" /> Hasil
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={filterWarga} onValueChange={setFilterWarga}>
              <SelectTrigger className="sm:w-[220px]"><SelectValue placeholder="Filter warga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Warga</SelectItem>
                {wargaList.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.namaLengkap}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada dokumentasi. Klik "Tambah Dokumentasi" untuk memulai.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((d) => {
                const sc = statusConfig(d.status);
                const StatusIcon = sc.icon;
                return (
                  <Card key={d.id} className={`card-lift shadow-md border-0 border-l-4 ${d.tipe === "planning" ? "border-l-blue-500" : "border-l-emerald-500"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {d.tipe === "planning" ? (
                            <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Award className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-sm">{d.judul}</div>
                            <div className="text-xs text-muted-foreground">{d.warga?.namaLengkap}</div>
                          </div>
                        </div>
                        <Badge className={`${sc.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" /> {sc.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{d.deskripsi}</p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">{d.progress}%</span>
                        </div>
                        <Progress value={d.progress} className="h-2" />
                      </div>

                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(d.tanggal)}
                        </span>
                        {d.targetDate && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Target: {formatDate(d.targetDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1 mt-3 pt-3 border-t">
                        {isAdmin && (
                          <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => openEdit(d)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteId(d.id)}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Dokumentasi" : "Tambah Dokumentasi"}</DialogTitle>
            <DialogDescription>
              Catat perencanaan (planning) ke depan atau hasil yang sudah dicapai warga/RT.
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
                      {w.namaLengkap} ({w.nik})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="judul">Judul *</Label>
              <Input
                id="judul"
                value={form.judul}
                onChange={(e) => setForm({ ...form, judul: e.target.value })}
                placeholder="Judul perencanaan / hasil"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipe">Tipe *</Label>
                <Select value={form.tipe} onValueChange={(v) => setForm({ ...form, tipe: v as "planning" | "hasil" })}>
                  <SelectTrigger id="tipe"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning (Rencana)</SelectItem>
                    <SelectItem value="hasil">Hasil (Tercapai)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="berjalan">Berjalan</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                    <SelectItem value="tertunda">Tertunda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="targetDate">Target Tanggal (opsional)</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi *</Label>
              <Textarea
                id="deskripsi"
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                rows={4}
                placeholder="Jelaskan perencanaan atau hasil yang dicapai..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress">Progress: {form.progress}%</Label>
              <input
                id="progress"
                type="range"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="w-full accent-primary"
              />
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
            <AlertDialogTitle>Hapus dokumentasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumentasi yang dihapus tidak dapat dikembalikan.
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
