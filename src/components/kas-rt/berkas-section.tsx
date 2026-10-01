"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  File,
  Image as ImageIcon,
  FileCheck,
  Paperclip,
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
  formatDate,
  formatFileSize,
  KATEGORI_BERKAS,
  type Berkas,
  type Warga,
} from "@/lib/kas";

function getFileIcon(type: string, name: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-purple-600" />;
  if (type.includes("pdf")) return <FileCheck className="h-5 w-5 text-red-600" />;
  if (type.includes("word") || name.match(/\.(doc|docx)$/i)) return <FileText className="h-5 w-5 text-blue-600" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function BerkasSection() {
  const [list, setList] = useState<Berkas[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWarga, setFilterWarga] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    wargaId: "",
    kategori: KATEGORI_BERKAS[0],
    keterangan: "",
    namaBerkas: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterWarga !== "all") params.set("wargaId", filterWarga);
    fetch(`/api/berkas?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoading(false));
  }, [filterWarga]);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openUpload() {
    setForm({ wargaId: "", kategori: KATEGORI_BERKAS[0], keterangan: "", namaBerkas: "" });
    setSelectedFile(null);
    setUploadOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setSelectedFile(f);
    if (f && !form.namaBerkas) {
      setForm((prev) => ({ ...prev, namaBerkas: f.name }));
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "Validasi gagal", description: "Pilih file terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!form.wargaId) {
      toast({ title: "Validasi gagal", description: "Pilih warga terlebih dahulu", variant: "destructive" });
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("wargaId", form.wargaId);
      fd.append("kategori", form.kategori);
      fd.append("keterangan", form.keterangan);
      fd.append("namaBerkas", form.namaBerkas || selectedFile.name);
      const res = await authFetch("/api/berkas", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal upload");
      toast({ title: "Berhasil", description: "Berkas diupload" });
      setUploadOpen(false);
      fetchList();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await authFetch(`/api/berkas/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Berhasil", description: "Berkas dihapus" });
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

  function handleDownload(b: Berkas) {
    window.open(`/api/berkas/download/${b.id}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-2">
                <Paperclip className="h-4 w-4 text-amber-600" />
              </div>
              Berkas & Dokumen Warga
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterWarga} onValueChange={setFilterWarga}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter warga" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Warga</SelectItem>
                  {wargaList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.namaLengkap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openUpload} className="gap-2 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <Upload className="h-4 w-4" /> Upload Berkas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada berkas. Klik "Upload Berkas" untuk menambahkan.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((b) => (
                <Card key={b.id} className="card-lift shadow-md border-0 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2 flex-shrink-0">
                        {getFileIcon(b.fileType, b.namaBerkas)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={b.namaBerkas}>
                          {b.namaBerkas}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.warga?.namaLengkap || "—"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{b.kategori}</Badge>
                          <span className="text-[10px] text-muted-foreground">{formatFileSize(b.fileSize)}</span>
                        </div>
                        {b.keterangan && (
                          <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {b.keterangan}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                          {formatDate(b.uploadedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 flex-1"
                        onClick={() => handleDownload(b)}
                      >
                        <Download className="h-3.5 w-3.5" /> Unduh
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteId(b.id)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Berkas Warga</DialogTitle>
            <DialogDescription>
              Unggah dokumen warga (KTP, KK, Akta, dll). Maksimal 10MB.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wargaId">Pilih Warga *</Label>
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
              <Label htmlFor="kategori">Kategori Berkas *</Label>
              <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                <SelectTrigger id="kategori"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_BERKAS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setSelectedFile(f);
                    if (!form.namaBerkas) setForm((prev) => ({ ...prev, namaBerkas: f.name }));
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="space-y-1">
                    <FileCheck className="h-8 w-8 mx-auto text-emerald-600" />
                    <div className="font-medium text-sm">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div className="text-sm font-medium">Klik atau drag file ke sini</div>
                    <div className="text-xs text-muted-foreground">Maks 10MB</div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="namaBerkas">Nama Tampilan Berkas</Label>
              <Input
                id="namaBerkas"
                value={form.namaBerkas}
                onChange={(e) => setForm({ ...form, namaBerkas: e.target.value })}
                placeholder="Nama deskriptif berkas"
              />
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
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Mengupload..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus berkas ini?</AlertDialogTitle>
            <AlertDialogDescription>
              File akan dihapus permanen dari server.
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
