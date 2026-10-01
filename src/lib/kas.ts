// Shared utilities & types untuk aplikasi Vilkar Kosambi Blok D

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Tipe data
export interface Warga {
  id: string;
  nik: string;
  namaLengkap: string;
  alias: string | null;
  jenisKelamin: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string;
  noRumah: string | null;
  noHp: string | null;
  email: string | null;
  pekerjaan: string | null;
  status: string;
  kepalaKeluarga: boolean;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KasTransaction {
  id: string;
  tanggal: string;
  jenis: "masuk" | "keluar";
  kategori: string;
  jumlah: number;
  keterangan: string | null;
  buktiUrl: string | null;
  wargaId: string | null;
  warga?: { namaLengkap: string; nik: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Berkas {
  id: string;
  wargaId: string;
  namaBerkas: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  kategori: string;
  keterangan: string | null;
  uploadedAt: string;
  updatedAt: string;
  warga?: { namaLengkap: string; nik: string } | null;
}

export interface Dokumentasi {
  id: string;
  wargaId: string;
  judul: string;
  tipe: "planning" | "hasil";
  tanggal: string;
  deskripsi: string;
  targetDate: string | null;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  warga?: { namaLengkap: string; nik: string } | null;
}

export interface DashboardData {
  keuangan: {
    totalMasuk: number;
    totalKeluar: number;
    saldo: number;
    jumlahTransaksi: number;
  };
  warga: {
    total: number;
    lakiLaki: number;
    perempuan: number;
    aktif: number;
    kepalaKeluarga: number;
  };
  berkas: {
    total: number;
    totalSize: number;
  };
  dokumentasi: {
    total: number;
    planning: number;
    hasil: number;
    planningSelesai: number;
  };
  tagihan: {
    bulanIniTotal: number;
    bulanIniLunas: number;
    collectionRateBulanIni: number;
    terkumpulTahunIni: number;
    totalTahunIni: number;
    belumBayarTahunIni: number;
  };
  kategoriBreakdown: { kategori: string; masuk: number; keluar: number }[];
  monthlyTrend: { label: string; key: string; masuk: number; keluar: number }[];
}

export const KATEGORI_KAS = [
  "Iuran Bulanan",
  "Sumbangan",
  "Kebersihan",
  "Keamanan",
  "Operasional",
  "Sosial",
  "Pembangunan",
  "Lainnya",
];

export const KATEGORI_BERKAS = [
  "KTP",
  "Kartu Keluarga",
  "Akta Kelahiran",
  "Akta Nikah",
  "Sertifikat Rumah",
  "IJAZAH",
  "Dokumen Medis",
  "Lainnya",
];

export const JENIS_TAGIHAN = [
  "Iuran Bulanan",
  "Iuran Keamanan",
  "Iuran Kebersihan",
  "Iuran Sampah",
  "Iuran Lingkungan",
  "Lainnya",
];

export interface Tagihan {
  id: string;
  wargaId: string;
  jenisTagihan: string;
  nominal: number;
  bulan: number;
  tahun: number;
  status: string;
  keterangan: string | null;
  kasTrxId: string | null;
  createdAt: string;
  updatedAt: string;
  warga?: { id: string; namaLengkap: string; nik: string; alias: string | null; noRumah: string | null; kepalaKeluarga: boolean; status: string } | null;
}
