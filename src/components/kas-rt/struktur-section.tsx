"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Wallet,
  ClipboardList,
  Shield,
  Phone,
  User,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { ReadOnlyBadge } from "@/components/kas-rt/role-banner";
import type { Warga } from "@/lib/kas";

interface Struktur {
  id: string;
  jabatan: string;
  nama: string;
  wargaId: string | null;
  noHp: string | null;
  keterangan: string | null;
  urutan: number;
  koordinatorGang: string | null;
}

// Icon per jabatan
function getJabatanIcon(jabatan: string) {
  const j = jabatan.toLowerCase();
  if (j.includes("ketua")) return { icon: Crown, color: "from-amber-500 to-yellow-600", bg: "bg-amber-500" };
  if (j.includes("bendahara")) return { icon: Wallet, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-500" };
  if (j.includes("sekretaris") || j.includes("sekre")) return { icon: ClipboardList, color: "from-blue-500 to-cyan-600", bg: "bg-blue-500" };
  if (j.includes("koordinator")) return { icon: MapPin, color: "from-rose-500 to-red-600", bg: "bg-rose-500" };
  if (j.includes("keamanan") || j.includes("satpam")) return { icon: Shield, color: "from-violet-500 to-purple-600", bg: "bg-violet-500" };
  return { icon: User, color: "from-slate-500 to-gray-600", bg: "bg-slate-500" };
}

const emptyForm = {
  jabatan: "",
  nama: "",
  wargaId: "",
  noHp: "",
  keterangan: "",
  urutan: "0",
  koordinatorGang: "",
};

export function StrukturSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const [list, setList] = useState<Struktur[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    fetch("/api/struktur")
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/warga")
      .then((r) => r.json())
      .then((j) => setWargaList(j.data || []));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    setForm({ ...emptyForm, urutan: String(list.length + 1) });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(s: Struktur) {
    setForm({
      jabatan: s.jabatan,
      nama: s.nama,
      wargaId: s.wargaId || "",
      noHp: s.noHp || "",
      keterangan: s.keterangan || "",
      urutan: String(s.urutan),
      koordinatorGang: s.koordinatorGang || "",
    });
    setEditingId(s.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.jabatan || !form.nama) {
      toast({ title: "Validasi gagal", description: "Jabatan dan nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(editingId ? `/api/struktur/${editingId}` : "/api/struktur", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          urutan: Number(form.urutan),
          wargaId: form.wargaId || null,
          koordinatorGang: form.koordinatorGang || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: editingId ? "Struktur diperbarui" : "Pengurus ditambahkan" });
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
      const res = await authFetch(`/api/struktur/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Gagal menghapus");
      }
      toast({ title: "Berhasil", description: "Pengurus dihapus" });
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

  // Saat pilih warga dari dropdown, auto-isi nama & noHp
  function handleWargaSelect(id: string) {
    if (id === "none") {
      setForm({ ...form, wargaId: "" });
      return;
    }
    const w = wargaList.find((w) => w.id === id);
    if (w) {
      setForm({ ...form, wargaId: id, nama: w.namaLengkap, noHp: w.noHp || form.noHp });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="card-lift shadow-md border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-2">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
                Struktur Pengurus Vilkar
                <ReadOnlyBadge isAdmin={isAdmin} />
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Susunan kepengurusan Vilkar Kosambi Blok D — Ketua, Bendahara, Sekretaris, dll
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={openCreate} className="gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <Plus className="h-4 w-4" /> Tambah Pengurus
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded shimmer" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada data pengurus.
              {isAdmin && " Klik \"Tambah Pengurus\" untuk memulai."}
            </div>
          ) : (() => {
            // Kategorisasi pengurus untuk pohon hierarki
            const ketua = list.find((s) => s.jabatan.toLowerCase().includes("ketua") && !s.jabatan.toLowerCase().includes("wakil"));
            const wakilKetua = list.find((s) => s.jabatan.toLowerCase().includes("wakil ketua") || s.jabatan.toLowerCase().includes("wakil"));
            const penasehat = list.filter((s) => s.jabatan.toLowerCase().includes("penasehat") || s.jabatan.toLowerCase().includes("penasihat"));
            const bendahara = list.filter((s) => s.jabatan.toLowerCase().includes("bendahara"));
            const sekretaris = list.filter((s) => s.jabatan.toLowerCase().includes("sekretaris") || s.jabatan.toLowerCase().includes("sekre"));
            // Koordinator gang: pengurus yang punya koordinatorGang != null
            const koordinatorGangList = list.filter((s) => s.koordinatorGang && s.koordinatorGang.trim() !== "");
            // Group koordinator by gang
            const gangMap = new Map<string, Struktur[]>();
            koordinatorGangList.forEach((s) => {
              const g = s.koordinatorGang!;
              if (!gangMap.has(g)) gangMap.set(g, []);
              gangMap.get(g)!.push(s);
            });
            const gangList = Array.from(gangMap.entries()).sort(([a], [b]) => a.localeCompare(b));
            const sieList = list.filter((s) => {
              const j = s.jabatan.toLowerCase();
              // Exclude yang sudah jadi koordinator gang
              if (s.koordinatorGang && s.koordinatorGang.trim() !== "") return false;
              return j.includes("sie") || j.includes("koordinator") || j.includes("keamanan") || j.includes("kebersihan") || j.includes("sosial") || j.includes("pemuda");
            });
            // Sisanya yang belum terkategori
            const lainnya = list.filter((s) => {
              const allCategorized = [ketua, wakilKetua, ...penasehat, ...bendahara, ...sekretaris, ...sieList, ...koordinatorGangList]
                .filter(Boolean)
                .map((x) => x!.id);
              return !allCategorized.includes(s.id);
            });

            const renderNode = (s: Struktur, size: "lg" | "md" | "sm" = "md") => {
              const { icon: JabatanIcon, color, bg } = getJabatanIcon(s.jabatan);
              const sizeClass = size === "lg" ? "min-w-[200px]" : size === "md" ? "min-w-[170px]" : "min-w-[150px]";
              return (
                <Card className={`card-lift shadow-md border-0 overflow-hidden ${sizeClass}`} key={s.id}>
                  <div className={`h-1 bg-gradient-to-r ${color}`} />
                  <CardContent className="p-3 text-center">
                    <div className={`rounded-full ${bg} p-2 mx-auto w-fit mb-2`}>
                      <JabatanIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.jabatan}</div>
                    <div className="font-bold text-sm mt-0.5">{s.nama}</div>
                    {s.noHp && (
                      <a href={`tel:${s.noHp}`} className="text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mt-1">
                        <Phone className="h-3 w-3" /> {s.noHp}
                      </a>
                    )}
                    {s.keterangan && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{s.keterangan}</p>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 mt-2 pt-2 border-t justify-center">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEdit(s)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteId(s.id)}
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            };

            return (
              <div className="space-y-6">
                {/* Penasehat (paling atas, opsional) */}
                {penasehat.length > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Penasehat</div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {penasehat.map((s) => renderNode(s, "sm"))}
                    </div>
                    <div className="w-px h-6 bg-border" />
                  </div>
                )}

                {/* Ketua (puncak pohon) */}
                {ketua && (
                  <div className="flex flex-col items-center">
                    {renderNode(ketua, "lg")}
                    {((wakilKetua || bendahara.length > 0 || sekretaris.length > 0 || sieList.length > 0 || lainnya.length > 0)) && (
                      <div className="w-px h-8 bg-border" />
                    )}
                  </div>
                )}

                {/* Level 2: Wakil Ketua + Bendahara + Sekretaris */}
                {(wakilKetua || bendahara.length > 0 || sekretaris.length > 0) && (
                  <>
                    <div className="relative">
                      {/* Garis horizontal penghubung */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-border" style={{ maxWidth: "80%" }} />
                      <div className="flex flex-wrap justify-center gap-4 pt-0">
                        {wakilKetua && (
                          <div className="flex flex-col items-center">
                            <div className="w-px h-8 bg-border" />
                            {renderNode(wakilKetua, "md")}
                          </div>
                        )}
                        {bendahara.map((s) => (
                          <div className="flex flex-col items-center" key={s.id}>
                            <div className="w-px h-8 bg-border" />
                            {renderNode(s, "md")}
                          </div>
                        ))}
                        {sekretaris.map((s) => (
                          <div className="flex flex-col items-center" key={s.id}>
                            <div className="w-px h-8 bg-border" />
                            {renderNode(s, "md")}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Level 3: Sie-Sie (jika ada) */}
                {sieList.length > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-px h-8 bg-border" />
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sie / Koordinator</div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {sieList.map((s) => renderNode(s, "sm"))}
                    </div>
                  </div>
                )}

                {/* Level 4: Koordinator Gang (per gang) */}
                {gangList.length > 0 && (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-px h-8 bg-border" />
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Koordinator Gang
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 w-full">
                      {gangList.map(([gangName, members]) => (
                        <div key={gangName} className="flex flex-col items-center">
                          <div className="rounded-full bg-amber-500 text-white text-xs font-bold px-3 py-1 mb-2 shadow-sm">
                            {gangName}
                          </div>
                          <div className="flex flex-col gap-2">
                            {members.map((s) => renderNode(s, "sm"))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lainnya */}
                {lainnya.length > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="w-px h-8 bg-border" />
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Lainnya</div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {lainnya.map((s) => renderNode(s, "sm"))}
                    </div>
                  </div>
                )}

                {/* Mobile fallback: jika tidak ada ketua (data custom), tampilkan flat grid */}
                {!ketua && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((s) => {
                      const { icon: JabatanIcon, color, bg } = getJabatanIcon(s.jabatan);
                      return (
                        <Card key={s.id} className="card-lift shadow-md border-0 overflow-hidden">
                          <div className={`h-1 bg-gradient-to-r ${color}`} />
                          <CardContent className="p-3 text-center">
                            <div className={`rounded-full ${bg} p-2 mx-auto w-fit mb-2`}>
                              <JabatanIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.jabatan}</div>
                            <div className="font-bold text-sm mt-0.5">{s.nama}</div>
                            {s.noHp && (
                              <a href={`tel:${s.noHp}`} className="text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mt-1">
                                <Phone className="h-3 w-3" /> {s.noHp}
                              </a>
                            )}
                            {isAdmin && (
                              <div className="flex gap-1 mt-2 pt-2 border-t justify-center">
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openEdit(s)}>
                                  <Pencil className="h-3 w-3" /> Edit
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => setDeleteId(s.id)} title="Hapus">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pengurus" : "Tambah Pengurus"}</DialogTitle>
            <DialogDescription>
              Isi data pengurus Vilkar. Bisa pilih dari warga terdaftar atau input manual.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wargaId">Pilih dari Warga Terdaftar (opsional)</Label>
              <Select
                value={form.wargaId || "none"}
                onValueChange={handleWargaSelect}
              >
                <SelectTrigger id="wargaId"><SelectValue placeholder="-- Input manual --" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Input manual --</SelectItem>
                  {wargaList.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.namaLengkap} {w.noRumah ? `(Rumah ${w.noRumah})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pilih warga untuk auto-isi nama & HP, atau biarkan untuk input manual</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jabatan">Jabatan *</Label>
                <Input
                  id="jabatan"
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  placeholder="Ketua, Bendahara, Sekretaris..."
                  list="jabatan-list"
                />
                <datalist id="jabatan-list">
                  <option value="Ketua" />
                  <option value="Wakil Ketua" />
                  <option value="Bendahara" />
                  <option value="Wakil Bendahara" />
                  <option value="Sekretaris" />
                  <option value="Koordinator Gang" />
                  <option value="Koordinator Blok" />
                  <option value="Koordinator Wilayah" />
                  <option value="Sie Keamanan" />
                  <option value="Sie Kebersihan" />
                  <option value="Sie Sosial" />
                  <option value="Sie Pemuda" />
                  <option value="Sie Lingkungan" />
                  <option value="Sie Humas" />
                  <option value="Penasehat" />
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urutan">Urutan Tampil</Label>
                <Input
                  id="urutan"
                  type="number"
                  min="0"
                  value={form.urutan}
                  onChange={(e) => setForm({ ...form, urutan: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">1=Ketua, 2=Wakil, dst</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama pengurus"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noHp">No. HP</Label>
              <Input
                id="noHp"
                value={form.noHp}
                onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="koordinatorGang">Koordinator Gang (opsional)</Label>
              <Input
                id="koordinatorGang"
                value={form.koordinatorGang}
                onChange={(e) => setForm({ ...form, koordinatorGang: e.target.value })}
                placeholder="mis: Gang A, Gang B, Gang C..."
                list="gang-list"
              />
              <datalist id="gang-list">
                <option value="Gang A" />
                <option value="Gang B" />
                <option value="Gang C" />
                <option value="Gang D" />
                <option value="Gang E" />
              </datalist>
              <p className="text-xs text-muted-foreground">Isi jika pengurus ini adalah koordinator suatu gang (akan tampil di section Koordinator Gang)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                rows={2}
                placeholder="Periode jabatan, tugas, dll"
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
            <AlertDialogTitle>Hapus pengurus ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data pengurus akan dihapus permanen.
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
