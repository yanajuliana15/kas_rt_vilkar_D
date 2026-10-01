import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/seed - isi data contoh (hanya jika kosong)
export async function POST() {
  try {
    const count = await db.warga.count();
    if (count > 0) {
      return NextResponse.json({
        message: "Data sudah ada, seed dilewati",
        count,
      });
    }

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return iso(d);
    };

    const wargaList = [
      {
        nik: "3201010101900001",
        namaLengkap: "Budi Santoso",
        alias: "Pak Budi",
        jenisKelamin: "L",
        tempatLahir: "Bandung",
        tanggalLahir: "1975-03-15",
        alamat: "Jl. Melati No. 1, Vilkar Kosambi Blok D",
        noRumah: "A-01",
        noHp: "081234567801",
        pekerjaan: "Guru",
        status: "aktif",
        kepalaKeluarga: true,
        keterangan: "Ketua Vilkar Kosambi Blok D",
      },
      {
        nik: "3201010202800002",
        namaLengkap: "Siti Aminah",
        alias: "Bu Siti",
        jenisKelamin: "P",
        tempatLahir: "Jakarta",
        tanggalLahir: "1980-07-22",
        alamat: "Jl. Melati No. 1, Vilkar Kosambi Blok D",
        noRumah: "A-01",
        noHp: "081234567802",
        pekerjaan: "Ibu Rumah Tangga",
        status: "aktif",
        kepalaKeluarga: false,
      },
      {
        nik: "3201010303850003",
        namaLengkap: "Ahmad Fauzi",
        alias: "Pak Ahmad",
        jenisKelamin: "L",
        tempatLahir: "Bekasi",
        tanggalLahir: "1985-11-10",
        alamat: "Jl. Melati No. 3, Vilkar Kosambi Blok D",
        noRumah: "A-03",
        noHp: "081234567803",
        pekerjaan: "Wiraswasta",
        status: "aktif",
        kepalaKeluarga: true,
      },
      {
        nik: "3201010404920004",
        namaLengkap: "Dewi Lestari",
        alias: "Bu Dewi",
        jenisKelamin: "P",
        tempatLahir: "Bandung",
        tanggalLahir: "1992-05-30",
        alamat: "Jl. Mawar No. 5, Vilkar Kosambi Blok D",
        noRumah: "B-05",
        noHp: "081234567804",
        pekerjaan: "Karyawan Swasta",
        status: "aktif",
        kepalaKeluarga: false,
      },
      {
        nik: "3201010505780005",
        namaLengkap: "Hendra Wijaya",
        alias: "Pak Hendra",
        jenisKelamin: "L",
        tempatLahir: "Cirebon",
        tanggalLahir: "1978-09-12",
        alamat: "Jl. Anggrek No. 2, Vilkar Kosambi Blok D",
        noRumah: "B-02",
        noHp: "081234567805",
        pekerjaan: "PNS",
        status: "aktif",
        kepalaKeluarga: true,
      },
      {
        nik: "3201010606900006",
        namaLengkap: "Rina Marlina",
        alias: "Bu Rina",
        jenisKelamin: "P",
        tempatLahir: "Sukabumi",
        tanggalLahir: "1990-12-25",
        alamat: "Jl. Anggrek No. 2, Vilkar Kosambi Blok D",
        noRumah: "B-02",
        noHp: "081234567806",
        pekerjaan: "Perawat",
        status: "aktif",
        kepalaKeluarga: false,
      },
    ];

    const createdWarga = await Promise.all(
      wargaList.map((w) => db.warga.create({ data: w }))
    );

    // Transaksi kas contoh
    const transactions = [
      { tanggal: daysAgo(60), jenis: "masuk", kategori: "Iuran Bulanan", jumlah: 1500000, keterangan: "Iuran bulanan warga - September", wargaId: createdWarga[0].id },
      { tanggal: daysAgo(58), jenis: "keluar", kategori: "Kebersihan", jumlah: 300000, keterangan: "Honor petugas kebersihan" },
      { tanggal: daysAgo(55), jenis: "keluar", kategori: "Keamanan", jumlah: 450000, keterangan: "Honor satpam 2 orang" },
      { tanggal: daysAgo(50), jenis: "masuk", kategori: "Sumbangan", jumlah: 500000, keterangan: "Sumbangan Pak Hendra untuk acara 17an" },
      { tanggal: daysAgo(45), jenis: "keluar", kategori: "Operasional", jumlah: 200000, keterangan: "Beli alat tulis & perlengkapan kantor Vilkar" },
      { tanggal: daysAgo(30), jenis: "masuk", kategori: "Iuran Bulanan", jumlah: 1500000, keterangan: "Iuran bulanan warga - Oktober" },
      { tanggal: daysAgo(28), jenis: "keluar", kategori: "Kebersihan", jumlah: 300000, keterangan: "Honor petugas kebersihan" },
      { tanggal: daysAgo(25), jenis: "keluar", kategori: "Keamanan", jumlah: 450000, keterangan: "Honor satpam 2 orang" },
      { tanggal: daysAgo(20), jenis: "keluar", kategori: "Sosial", jumlah: 750000, keterangan: "Bantuan warga sakit (Bu Sumiyati)" },
      { tanggal: daysAgo(15), jenis: "masuk", kategori: "Sumbangan", jumlah: 1000000, keterangan: "Sumbangan acara hari raya" },
      { tanggal: daysAgo(10), jenis: "keluar", kategori: "Operasional", jumlah: 350000, keterangan: "Perbaikan lampu jalan" },
      { tanggal: daysAgo(5), jenis: "masuk", kategori: "Iuran Bulanan", jumlah: 1500000, keterangan: "Iuran bulanan warga - November", wargaId: createdWarga[2].id },
      { tanggal: daysAgo(3), jenis: "keluar", kategori: "Kebersihan", jumlah: 300000, keterangan: "Honor petugas kebersihan" },
      { tanggal: daysAgo(1), jenis: "keluar", kategori: "Keamanan", jumlah: 450000, keterangan: "Honor satpam 2 orang" },
    ];

    await Promise.all(
      transactions.map((t) =>
        db.kasTransaction.create({
          data: {
            tanggal: t.tanggal,
            jenis: t.jenis,
            kategori: t.kategori,
            jumlah: t.jumlah,
            keterangan: t.keterangan,
            wargaId: t.wargaId || null,
          },
        })
      )
    );

    // Setting: iuran amount default
    await db.setting.upsert({
      where: { key: "iuranAmount" },
      create: { key: "iuranAmount", value: "25000" },
      update: { value: "25000" },
    });

    // === TAGIHAN WARGA (explicit tagihan entity) ===
    // 3 jenis tagihan x 3 bulan terakhir x 6 warga, dengan pola bayar beragam
    const jenisTagihanList = [
      { jenis: "Iuran Bulanan", nominal: 25000 },
      { jenis: "Iuran Keamanan", nominal: 15000 },
      { jenis: "Iuran Kebersihan", nominal: 10000 },
    ];

    // Pola bayar per warga untuk 3 bulan: [2bulanLalu, 1bulanLalu, bulanIni]
    const bayarPattern: boolean[][] = [
      // Budi (KK) - selalu bayar semua
      [true, true, true],
      // Siti - bayar 2 bulan lalu & lalu, belum bulan ini
      [true, true, false],
      // Ahmad (KK) - bayar 2 bulan lalu, belum 2 bulan terakhir
      [true, false, false],
      // Dewi - baru bayar bulan ini
      [false, false, true],
      // Hendra (KK) - selalu bayar
      [true, true, true],
      // Rina - belum bayar sama sekali
      [false, false, false],
    ];

    const bulanNama = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];

    const tagihanData: {
      wargaId: string;
      jenisTagihan: string;
      nominal: number;
      bulan: number;
      tahun: number;
      status: string;
      keterangan: string | null;
      tanggalTrx?: string;
      namaBulan?: string;
    }[] = [];

    for (let m = 2; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const namaBulan = `${bulanNama[d.getMonth()]} ${y}`;
      const tanggal = `${y}-${String(mo).padStart(2, "0")}-01`;
      jenisTagihanList.forEach((jt) => {
        createdWarga.forEach((w, idx) => {
          const isBayar = bayarPattern[idx][2 - m];
          tagihanData.push({
            wargaId: w.id,
            jenisTagihan: jt.jenis,
            nominal: jt.nominal,
            bulan: mo,
            tahun: y,
            status: isBayar ? "lunas" : "belum_bayar",
            keterangan: `${jt.jenis} ${namaBulan}`,
            tanggalTrx: isBayar ? tanggal : undefined,
            namaBulan: isBayar ? namaBulan : undefined,
          });
        });
      });
    }

    // Create tagihan + (jika lunas) create kas trx & link
    for (const t of tagihanData) {
      let kasTrxId: string | null = null;
      if (t.status === "lunas" && t.tanggalTrx) {
        const trx = await db.kasTransaction.create({
          data: {
            tanggal: t.tanggalTrx,
            jenis: "masuk",
            kategori: t.jenisTagihan,
            jumlah: t.nominal,
            keterangan: `${t.jenisTagihan} ${t.namaBulan}`,
            wargaId: t.wargaId,
          },
        });
        kasTrxId = trx.id;
      }
      await db.tagihan.create({
        data: {
          wargaId: t.wargaId,
          jenisTagihan: t.jenisTagihan,
          nominal: t.nominal,
          bulan: t.bulan,
          tahun: t.tahun,
          status: t.status,
          keterangan: t.keterangan,
          kasTrxId,
        },
      });
    }

    const tagihanCreated = tagihanData.length;

    // Dokumentasi contoh
    const dokumentasi = [
      {
        wargaId: createdWarga[0].id,
        judul: "Renovasi Pos Kamling",
        tipe: "planning",
        tanggal: daysAgo(10),
        deskripsi: "Rencana renovasi pos kamling agar lebih nyaman untuk petugas keamanan. Anggaran diperkirakan Rp 3.000.000 dari dana kas.",
        targetDate: iso(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
        status: "berjalan",
        progress: 25,
      },
      {
        wargaId: createdWarga[0].id,
        judul: "Program Gotong Royong Rutin",
        tipe: "planning",
        tanggal: daysAgo(7),
        deskripsi: "Mengadakan kerja bakti setiap minggu pertama untuk menjaga kebersihan lingkungan Vilkar.",
        targetDate: iso(new Date(today.getFullYear() + 1, 0, 1)),
        status: "berjalan",
        progress: 40,
      },
      {
        wargaId: createdWarga[2].id,
        judul: "Pelatihan UMKM Warga",
        tipe: "planning",
        tanggal: daysAgo(5),
        deskripsi: "Merencanakan pelatihan kewirausahaan bagi warga yang memiliki usaha rumahan.",
        targetDate: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
        status: "berjalan",
        progress: 10,
      },
      {
        wargaId: createdWarga[0].id,
        judul: "Peringatan HUT RI ke-79",
        tipe: "hasil",
        tanggal: daysAgo(40),
        deskripsi: "Berhasil mengadakan acara peringatan HUT RI dengan partisipasi 95% warga. Terdapat lomba anak-anak dan dewasa, serta penghargaan untuk warga berprestasi.",
        status: "selesai",
        progress: 100,
      },
      {
        wargaId: createdWarga[4].id,
        judul: "Pemasangan CCTV Area Vilkar",
        tipe: "hasil",
        tanggal: daysAgo(50),
        deskripsi: "Pemasangan 3 unit CCTV di titik strategis telah selesai. Meningkatkan keamanan lingkungan secara signifikan.",
        status: "selesai",
        progress: 100,
      },
      {
        wargaId: createdWarga[2].id,
        judul: "Pembentukan Tim Keamanan",
        tipe: "hasil",
        tanggal: daysAgo(70),
        deskripsi: "Telah dibentuk tim keamanan terdiri dari 4 satpam dengan jadwal patroli 24 jam.",
        status: "selesai",
        progress: 100,
      },
    ];

    await Promise.all(
      dokumentasi.map((d) => db.dokumentasi.create({ data: d }))
    );

    // === PASSWORD DEFAULT (admin & superadmin) - backward compat ===
    await db.setting.upsert({
      where: { key: "adminPassword" },
      create: { key: "adminPassword", value: "admin123" },
      update: { value: "admin123" },
    });
    await db.setting.upsert({
      where: { key: "superadminPassword" },
      create: { key: "superadminPassword", value: "super123" },
      update: { value: "super123" },
    });

    // === DEFAULT USERS (multi-user login) ===
    const { ensureDefaultUsers } = await import("@/lib/auth");
    await ensureDefaultUsers();
    // Tambah user contoh lain (bendahara, sekretaris) kalau belum ada
    const existingUsers = await db.adminUser.count();
    if (existingUsers <= 2) {
      const { createUser } = await import("@/lib/auth");
      try {
        await createUser("bendahara", "bendahara123", "admin", "Bendahara (Dewi Lestari)");
      } catch {}
      try {
        await createUser("sekretaris", "sekretaris123", "admin", "Sekretaris (Siti Aminah)");
      } catch {}
    }

    // === STRUKTUR PENGURUS CONTOH ===
    const strukturData = [
      { jabatan: "Ketua", nama: createdWarga[0].namaLengkap, wargaId: createdWarga[0].id, noHp: createdWarga[0].noHp, keterangan: "Periode 2024-2027", urutan: 1 },
      { jabatan: "Wakil Ketua", nama: createdWarga[4].namaLengkap, wargaId: createdWarga[4].id, noHp: createdWarga[4].noHp, keterangan: "Periode 2024-2027", urutan: 2 },
      { jabatan: "Bendahara", nama: createdWarga[3].namaLengkap, wargaId: createdWarga[3].id, noHp: createdWarga[3].noHp, keterangan: "Periode 2024-2027", urutan: 3 },
      { jabatan: "Sekretaris", nama: createdWarga[1].namaLengkap, wargaId: createdWarga[1].id, noHp: createdWarga[1].noHp, keterangan: "Periode 2024-2027", urutan: 4 },
      { jabatan: "Sie Keamanan", nama: createdWarga[2].namaLengkap, wargaId: createdWarga[2].id, noHp: createdWarga[2].noHp, keterangan: "Koordinator keamanan & satpam", urutan: 5 },
      { jabatan: "Sie Kebersihan", nama: createdWarga[5].namaLengkap, wargaId: createdWarga[5].id, noHp: createdWarga[5].noHp, keterangan: "Koordinator kebersihan lingkungan", urutan: 6 },
      // Koordinator Gang
      { jabatan: "Koordinator Gang A", nama: "Slamet Riyadi", noHp: "081234567810", keterangan: "Gang A - depan", urutan: 7, koordinatorGang: "Gang A" },
      { jabatan: "Koordinator Gang B", nama: "Joko Susilo", noHp: "081234567811", keterangan: "Gang B - tengah", urutan: 8, koordinatorGang: "Gang B" },
      { jabatan: "Koordinator Gang C", nama: "Bambang Wijaya", noHp: "081234567812", keterangan: "Gang C - belakang", urutan: 9, koordinatorGang: "Gang C" },
      { jabatan: "Koordinator Gang D", nama: "Sutrisno", noHp: "081234567813", keterangan: "Gang D - samping", urutan: 10, koordinatorGang: "Gang D" },
    ];
    await Promise.all(
      strukturData.map((s) => db.struktur.create({ data: s }))
    );

    // === PEMINJAMAN CONTOH ===
    const peminjamanData = [
      {
        wargaId: createdWarga[2].id, // Ahmad Fauzi
        jumlah: 2000000,
        bunga: 100000,
        tanggalPinjam: daysAgo(45),
        tanggalJatuhTempo: iso(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
        keterangan: "Modal usaha tambahan",
        status: "aktif",
        bayar: [{ tanggal: daysAgo(15), jumlah: 500000, keterangan: "Angsuran ke-1" }],
      },
      {
        wargaId: createdWarga[4].id, // Hendra Wijaya
        jumlah: 1000000,
        bunga: 50000,
        tanggalPinjam: daysAgo(90),
        tanggalJatuhTempo: daysAgo(0),
        keterangan: "Biaya pengobatan",
        status: "lunas",
        bayar: [
          { tanggal: daysAgo(60), jumlah: 500000, keterangan: "Angsuran ke-1" },
          { tanggal: daysAgo(30), jumlah: 550000, keterangan: "Pelunasan" },
        ],
      },
      {
        wargaId: createdWarga[3].id, // Dewi Lestari
        jumlah: 500000,
        bunga: 25000,
        tanggalPinjam: daysAgo(10),
        tanggalJatuhTempo: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
        keterangan: "Biaya pendidikan anak",
        status: "aktif",
        bayar: [],
      },
    ];

    let peminjamanCreated = 0;
    for (const p of peminjamanData) {
      // Buat kas trx pencairan
      const wargaInfo = await db.warga.findUnique({ where: { id: p.wargaId }, select: { namaLengkap: true } });
      const pencairanTrx = await db.kasTransaction.create({
        data: {
          tanggal: p.tanggalPinjam,
          jenis: "keluar",
          kategori: "Peminjaman",
          jumlah: p.jumlah,
          keterangan: `Pencairan pinjaman - ${wargaInfo?.namaLengkap || ""}`,
          wargaId: p.wargaId,
        },
      });

      const totalBayar = p.bayar.reduce((a, b) => a + b.jumlah, 0);
      const status = totalBayar >= p.jumlah + p.bunga ? "lunas" : p.status;

      const pinjaman = await db.peminjaman.create({
        data: {
          wargaId: p.wargaId,
          jumlah: p.jumlah,
          bunga: p.bunga,
          tanggalPinjam: p.tanggalPinjam,
          tanggalJatuhTempo: p.tanggalJatuhTempo,
          totalBayar,
          status,
          keterangan: p.keterangan,
          kasTrxIdPencairan: pencairanTrx.id,
        },
      });

      // Buat pembayaran + kas trx masuk
      for (const b of p.bayar) {
        const bayarTrx = await db.kasTransaction.create({
          data: {
            tanggal: b.tanggal,
            jenis: "masuk",
            kategori: "Pengembalian Pinjaman",
            jumlah: b.jumlah,
            keterangan: `Pembayaran pinjaman - ${wargaInfo?.namaLengkap || ""}`,
            wargaId: p.wargaId,
          },
        });
        await db.pembayaranPinjaman.create({
          data: {
            peminjamanId: pinjaman.id,
            tanggal: b.tanggal,
            jumlah: b.jumlah,
            keterangan: b.keterangan,
            kasTrxId: bayarTrx.id,
          },
        });
      }
      peminjamanCreated++;
    }

    return NextResponse.json({
      success: true,
      message: "Data contoh berhasil ditambahkan (password admin: admin123)",
      warga: createdWarga.length,
      transaksi: transactions.length,
      tagihan: tagihanCreated,
      peminjaman: peminjamanCreated,
      dokumentasi: dokumentasi.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal seed data", detail: String(e) },
      { status: 500 }
    );
  }
}
