"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Users, UserPlus, Phone, MapPin, Briefcase, Download, FileSpreadsheet, Upload, FileDown, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api-client";
import { type Warga } from "@/lib/kas";

const emptyForm = {
  nik: "",
  namaLengkap: "",
  alias: "",
  jenisKelamin: "L",
  tempatLahir: "",
  tanggalLahir: "",
  alamat: "",
  noRumah: "",
  noHp: "",
  email: "",
  pekerjaan: "",
  status: "aktif",
  kepalaKeluarga: false,
  keterangan: "",
};

export function WargaSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const [list, setList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    total: number;
    errors: { row: number; nik: string; error: string }[];
  } | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    fetch(`/api/warga?q=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchList, 300);
    return () => clearTimeout(t);
  }, [fetchList]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(w: Warga) {
    setForm({
      nik: w.nik,
      namaLengkap: w.namaLengkap,
      alias: w.alias || "",
      jenisKelamin: w.jenisKelamin,
      tempatLahir: w.tempatLahir || "",
      tanggalLahir: w.tanggalLahir || "",
      alamat: w.alamat,
      noRumah: w.noRumah || "",
      noHp: w.noHp || "",
      email: w.email || "",
      pekerjaan: w.pekerjaan || "",
      status: w.status,
      kepalaKeluarga: w.kepalaKeluarga,
      keterangan: w.keterangan || "",
    });
    setEditingId(w.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nik || !form.namaLengkap || !form.alamat) {
      toast({ title: "Validasi gagal", description: "NIK, Nama, dan Alamat wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(editingId ? `/api/warga/${editingId}` : "/api/warga", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({
        title: "Berhasil",
        description: editingId ? "Data warga diperbarui" : "Warga baru ditambahkan",
      });
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
      const res = await authFetch(`/api/warga/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Berhasil", description: "Data warga dihapus" });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setImportFile(f);
    setImportResult(null);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) {
      toast({ title: "Validasi gagal", description: "Pilih file Excel dulu", variant: "destructive" });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await authFetch("/api/warga/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal import");
      setImportResult(json.results);
      toast({
        title: "Import selesai",
        description: `${json.results.success} berhasil, ${json.results.failed} gagal dari ${json.results.total} baris`,
      });
      if (json.results.success > 0) fetchList();
    } catch (err) {
      toast({
        title: "Gagal import",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  function openImport() {
    setImportFile(null);
    setImportResult(null);
    setImportOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, NIK, alias, alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("/api/warga/export", "_blank")}
            className="gap-2 shadow-sm bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
            title="Export semua data warga ke Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={openImport}
              className="gap-2 shadow-sm bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              title="Import data warga dari Excel"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import Excel</span>
            </Button>
          )}
          {isAdmin && (
            <Button onClick={openCreate} className="gap-2 shadow-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              <UserPlus className="h-4 w-4" /> Tambah Warga
            </Button>
          )}
        </div>
      </div>

      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950 p-2">
              <Users className="h-4 w-4 text-cyan-600" />
            </div>
            Daftar Warga ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada data warga. Klik "Tambah Warga" untuk memulai.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">No</TableHead>
                    <TableHead>NIK / Nama</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((w, i) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{w.namaLengkap}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.nik}
                          {w.alias ? ` · ${w.alias}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {w.alamat}
                          {w.noRumah ? ` (Rumah ${w.noRumah})` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        {w.noHp ? (
                          <div className="text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {w.noHp}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {w.email && (
                          <div className="text-xs text-muted-foreground">{w.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {w.pekerjaan ? (
                          <span className="text-xs flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> {w.pekerjaan}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {w.kepalaKeluarga && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">KK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            w.status === "aktif"
                              ? "border-emerald-500 text-emerald-600"
                              : w.status === "pindah"
                              ? "border-amber-500 text-amber-600"
                              : "border-red-500 text-red-600"
                          }
                        >
                          {w.status}
                        </Badge>
                        {w.jenisKelamin === "L" ? (
                          <Badge variant="secondary" className="ml-1 text-[10px]">L</Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-1 text-[10px]">P</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(w)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(w.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Data Warga" : "Tambah Warga Baru"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Ubah informasi warga pada form di bawah."
                : "Lengkapi data warga RT."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK *</Label>
                <Input
                  id="nik"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value })}
                  placeholder="16 digit NIK"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                <Input
                  id="namaLengkap"
                  value={form.namaLengkap}
                  onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alias">Alias / Panggilan</Label>
                <Input
                  id="alias"
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenisKelamin">Jenis Kelamin *</Label>
                <Select
                  value={form.jenisKelamin}
                  onValueChange={(v) => setForm({ ...form, jenisKelamin: v })}
                >
                  <SelectTrigger id="jenisKelamin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempatLahir">Tempat Lahir</Label>
                <Input
                  id="tempatLahir"
                  value={form.tempatLahir}
                  onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                <Input
                  id="tanggalLahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="alamat">Alamat Lengkap *</Label>
                <Textarea
                  id="alamat"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noRumah">No. Rumah</Label>
                <Input
                  id="noRumah"
                  value={form.noRumah}
                  onChange={(e) => setForm({ ...form, noRumah: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noHp">No. HP</Label>
                <Input
                  id="noHp"
                  value={form.noHp}
                  onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pekerjaan">Pekerjaan</Label>
                <Input
                  id="pekerjaan"
                  value={form.pekerjaan}
                  onChange={(e) => setForm({ ...form, pekerjaan: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="pindah">Pindah</SelectItem>
                    <SelectItem value="meninggal">Meninggal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Checkbox
                  id="kepalaKeluarga"
                  checked={form.kepalaKeluarga}
                  onCheckedChange={(c) => setForm({ ...form, kepalaKeluarga: !!c })}
                />
                <Label htmlFor="kepalaKeluarga" className="cursor-pointer">
                  Kepala Keluarga
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Warga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data warga?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus warga beserta seluruh transaksi kas, berkas, dan dokumentasi terkait. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" /> Import Data Warga dari Excel
            </DialogTitle>
            <DialogDescription>
              Upload file Excel (.xlsx) berisi data warga. Download template untuk format yang benar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Download template */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileDown className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-700 dark:text-blue-300">Template Excel</div>
                    <div className="text-xs text-muted-foreground">Download template kosong + contoh + petunjuk</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/warga/template", "_blank")}
                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <FileDown className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>

            <form onSubmit={handleImport} className="space-y-3">
              {/* File input */}
              <div className="space-y-2">
                <Label htmlFor="import-file">File Excel (.xlsx)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById("import-file")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      setImportFile(f);
                      setImportResult(null);
                    }
                  }}
                >
                  <input
                    id="import-file"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {importFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                      <div className="font-medium text-sm">{importFile.name}</div>
                      <div className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div className="text-sm font-medium">Klik atau drag file Excel ke sini</div>
                      <div className="text-xs text-muted-foreground">Format .xlsx atau .xls</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Result */}
              {importResult && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {importResult.failed === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    Hasil Import
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-muted p-2">
                      <div className="text-lg font-bold">{importResult.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="rounded bg-emerald-50 dark:bg-emerald-950/40 p-2">
                      <div className="text-lg font-bold text-emerald-600">{importResult.success}</div>
                      <div className="text-xs text-muted-foreground">Berhasil</div>
                    </div>
                    <div className="rounded bg-rose-50 dark:bg-rose-950/40 p-2">
                      <div className="text-lg font-bold text-rose-600">{importResult.failed}</div>
                      <div className="text-xs text-muted-foreground">Gagal</div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto scrollbar-thin">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Detail error:</div>
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs flex items-start gap-1.5 bg-rose-50 dark:bg-rose-950/30 rounded px-2 py-1 mb-1">
                          <XCircle className="h-3 w-3 text-rose-500 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Baris {err.row}</strong>{err.nik && ` (NIK: ${err.nik})`}: {err.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Tutup</Button>
                <Button type="submit" disabled={importing || !importFile} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <Upload className="h-4 w-4" />
                  {importing ? "Mengimport..." : "Import Sekarang"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
