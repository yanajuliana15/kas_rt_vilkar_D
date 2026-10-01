"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  formatRupiah,
  formatNumber,
  type DashboardData,
} from "@/lib/kas";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = ["#14b8a6", "#dc2626", "#f59e0b", "#0891b2", "#7c3aed", "#db2777", "#65a30d", "#ea580c"];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

export function Dashboard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (active && json.data) {
          setData(json.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  const { keuangan, warga, berkas, dokumentasi, kategoriBreakdown, monthlyTrend } = data;

  const pieData = kategoriBreakdown
    .map((k) => ({ name: k.kategori, value: k.masuk + k.keluar }))
    .filter((d) => d.value > 0)
    .slice(0, 8);

  const summaryCards = [
    {
      title: "Total Pemasukan",
      value: formatRupiah(keuangan.totalMasuk),
      sub: `${keuangan.jumlahTransaksi} transaksi tercatat`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "shadow-emerald-500/20",
    },
    {
      title: "Total Pengeluaran",
      value: formatRupiah(keuangan.totalKeluar),
      sub: "Pengeluaran tercatat",
      icon: TrendingDown,
      gradient: "from-rose-500 to-red-600",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-600 dark:text-rose-400",
      glow: "shadow-rose-500/20",
    },
    {
      title: "Saldo Kas Vilkar Kosambi Blok D",
      value: formatRupiah(keuangan.saldo),
      sub: "Saldo berjalan",
      icon: Wallet,
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: keuangan.saldo >= 0 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
      glow: "shadow-amber-500/20",
    },
    {
      title: "Total Warga",
      value: formatNumber(warga.total),
      sub: `${warga.kepalaKeluarga} Kepala Keluarga`,
      icon: Users,
      gradient: "from-cyan-500 to-blue-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
      text: "text-cyan-600 dark:text-cyan-400",
      glow: "shadow-cyan-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 animated-gradient p-6 text-white shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium text-white/90">Selamat datang di Dashboard Kas Vilkar Kosambi Blok D</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              {formatRupiah(keuangan.saldo)}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Saldo kas Vilkar Kosambi Blok D saat ini · {formatNumber(keuangan.jumlahTransaksi)} transaksi
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/15 backdrop-blur-md px-4 py-3 ring-1 ring-white/20">
              <div className="flex items-center gap-1.5 text-xs text-white/80 mb-1">
                <ArrowUpRight className="h-3 w-3" /> Masuk
              </div>
              <div className="font-bold">{formatRupiah(keuangan.totalMasuk)}</div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-md px-4 py-3 ring-1 ring-white/20">
              <div className="flex items-center gap-1.5 text-xs text-white/80 mb-1">
                <ArrowDownRight className="h-3 w-3" /> Keluar
              </div>
              <div className="font-bold">{formatRupiah(keuangan.totalKeluar)}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className={`card-lift relative overflow-hidden border-0 shadow-lg ${card.glow}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-full ${card.bg} p-2`}>
                  <card.icon className={`h-4 w-4 ${card.text}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.text} count-up`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 card-lift shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              Tren Keuangan 6 Bulan Terakhir
            </CardTitle>
            <CardDescription>Perbandingan pemasukan dan pengeluaran per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="masukGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="keluarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                />
                <Tooltip
                  formatter={(v: number) => formatRupiah(v)}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Legend />
                <Bar dataKey="masuk" name="Pemasukan" fill="url(#masukGrad)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="keluar" name="Pengeluaran" fill="url(#keluarGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-lift shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950 p-2">
                <Wallet className="h-4 w-4 text-teal-600" />
              </div>
              Komposisi per Kategori
            </CardTitle>
            <CardDescription>Distribusi transaksi</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={(e: { name?: string }) => e.name ?? ""}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demografi & Dokumentasi & Iuran */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-lift shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Demografi Warga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Laki-laki</span>
              <Badge variant="outline" className="font-bold">{warga.lakiLaki}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Perempuan</span>
              <Badge variant="outline" className="font-bold">{warga.perempuan}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Warga Aktif</span>
              <Badge className="bg-emerald-500 hover:bg-emerald-600">{warga.aktif}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kepala Keluarga</span>
              <Badge variant="secondary">{warga.kepalaKeluarga}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Tagihan Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sudah Lunas</span>
              <Badge className="bg-emerald-500 hover:bg-emerald-600">
                {data.tagihan.bulanIniLunas}/{data.tagihan.bulanIniTotal}
              </Badge>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Tingkat Penagihan</span>
                <span className="font-bold">{data.tagihan.collectionRateBulanIni}%</span>
              </div>
              <Progress value={data.tagihan.collectionRateBulanIni} className="h-2" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Terkumpul Thn Ini</span>
              <Badge variant="secondary">{formatRupiah(data.tagihan.terkumpulTahunIni)}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Belum Bayar Thn Ini</span>
              <Badge variant="destructive">{data.tagihan.belumBayarTahunIni} tagihan</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Statistik Berkas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Berkas</span>
              <Badge variant="outline" className="font-bold">{berkas.total}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ukuran Total</span>
              <Badge variant="secondary">
                {(berkas.totalSize / (1024 * 1024)).toFixed(2)} MB
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift shadow-md border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" /> Planning & Hasil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planning</span>
              <Badge variant="outline" className="font-bold">{dokumentasi.planning}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hasil Tercapai</span>
              <Badge className="bg-emerald-500 hover:bg-emerald-600">{dokumentasi.hasil}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Planning Selesai</span>
              <Badge variant="secondary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {dokumentasi.planningSelesai}
              </Badge>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Penyelesaian</span>
                <span className="font-bold">
                  {dokumentasi.planning > 0
                    ? Math.round((dokumentasi.planningSelesai / dokumentasi.planning) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  dokumentasi.planning > 0
                    ? (dokumentasi.planningSelesai / dokumentasi.planning) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
