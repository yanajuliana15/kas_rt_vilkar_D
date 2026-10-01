"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  UserCircle,
  CheckCircle2,
  XCircle,
  KeyRound,
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api-client";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  nama: string;
  aktif: boolean;
  createdAt: string;
}

const emptyForm = {
  username: "",
  password: "",
  role: "admin" as "admin" | "superadmin",
  nama: "",
};

export function UsersSection() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchList = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((j) => setList(j.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(u: AdminUser) {
    setForm({
      username: u.username,
      password: "", // kosong = tidak ganti password
      role: u.role as "admin" | "superadmin",
      nama: u.nama,
    });
    setEditingId(u.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.nama || (!editingId && !form.password)) {
      toast({ title: "Validasi gagal", description: "Username, nama, dan password (untuk user baru) wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        username: form.username,
        role: form.role,
        nama: form.nama,
      };
      if (form.password) body.password = form.password;
      const res = await authFetch(editingId ? `/api/users/${editingId}` : "/api/users", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: editingId ? "User diperbarui" : "User baru dibuat" });
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
      const res = await authFetch(`/api/users/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus");
      toast({ title: "Berhasil", description: "User dihapus" });
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

  async function toggleAktif(u: AdminUser) {
    try {
      const res = await authFetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !u.aktif, role: u.role, nama: u.nama }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      toast({ title: "Berhasil", description: `User ${u.nama} ${u.aktif ? "dinonaktifkan" : "diaktifkan"}` });
      fetchList();
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  const adminCount = list.filter((u) => u.role === "admin" && u.aktif).length;
  const superadminCount = list.filter((u) => u.role === "superadmin" && u.aktif).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Akun</CardTitle>
            <div className="rounded-full bg-violet-50 dark:bg-violet-950 p-2">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{list.length}</div>
            <p className="text-xs text-muted-foreground mt-1">akun terdaftar</p>
          </CardContent>
        </Card>
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-violet-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Aktif</CardTitle>
            <div className="rounded-full bg-violet-50 dark:bg-violet-950 p-2">
              <Shield className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">akun admin aktif</p>
          </CardContent>
        </Card>
        <Card className="card-lift relative overflow-hidden border-0 shadow-lg shadow-purple-500/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Superadmin Aktif</CardTitle>
            <div className="rounded-full bg-purple-50 dark:bg-purple-950 p-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{superadminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">akun superadmin aktif</p>
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
                  <KeyRound className="h-4 w-4 text-purple-600" />
                </div>
                Kelola Login Pengguna
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Buat akun login untuk admin/superadmin lain. Superadmin bisa tambah, edit, hapus, & nonaktifkan akun.
              </CardDescription>
            </div>
            <Button onClick={openCreate} className="gap-1.5 shadow-md bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700">
              <Plus className="h-4 w-4" /> Tambah Akun
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded shimmer" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Belum ada akun. Klik "Tambah Akun" untuk membuat.
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-md border scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((u, i) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{u.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{u.username}</code>
                      </TableCell>
                      <TableCell>
                        {u.role === "superadmin" ? (
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
                        <button onClick={() => toggleAktif(u)} title="Klik untuk toggle aktif/nonaktif">
                          {u.aktif ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Nonaktif
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(u.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Akun" : "Tambah Akun Login"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Ubah data akun. Kosongkan password jika tidak ingin ganti."
                : "Buat akun login baru untuk admin atau superadmin."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="mis: Pak Budi (Bendahara)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                placeholder="mis: budi, bendahara01"
                required
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingId ? "(kosongkan jika tidak ganti)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 4 karakter"
                minLength={editingId ? 0 : 4}
                required={!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "admin" | "superadmin" })}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (input & kelola data)</SelectItem>
                  <SelectItem value="superadmin">Superadmin (akses penuh + kelola login)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan" : "Buat Akun"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
          <AlertDialogDescription>
              Akun login akan dihapus permanen. User tidak bisa login lagi dengan akun ini.
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
