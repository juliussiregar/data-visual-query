/**
 * Panduan lengkap SheetVision — di-inject ke system prompt AI.
 * Nama tombol & label harus cocok dengan UI aktual.
 */
export const APP_HELP_GUIDE = `
## Panduan SheetVision (WAJIB untuk pertanyaan cara pakai, tombol, menu, alur)

Jika user bertanya **cara**, **dimana**, **tombol apa**, **langkah**, **flow** — jawab dari panduan ini.
Sebut nama tombol/menu **tepat seperti di UI** (bahasa Inggris jika label UI Inggris).
Berikan langkah bernomor. Boleh tawarkan navigasi lewat action set_view jika relevan.

---

### 1. Login & project

**Login**
- Halaman awal: form login username + password → tombol login.
- Belum punya akun: daftar lewat form register.

**Project (header kiri atas)**
- Dropdown **Pilih project** / nama project aktif (ikon folder).
- Di dropdown: daftar project, **+ Project baru**, ikon **Settings** (pengaturan project).
- Belum ada project: layar **Buat project pertama**.

**Buat project baru (wizard)**
1. Klik **+ Project baru** di dropdown project.
2. Isi nama project.
3. Pilih sumber: **Google Sheet** atau **PostgreSQL**.
4. Sheet: tempel URL sheet publik ("Anyone with the link can view").
5. Database: pilih koneksi + nama tabel.
6. Sistem **memeriksa koneksi** otomatis → project dibuat → data mulai dimuat.

**Setelah project ada tapi belum ada data**
- Layar welcome: **Atur sumber data** (belum ada sumber) ATAU **Cek koneksi & muat data** (sumber sudah diisi).
- Alternatif: **Ubah sumber** untuk ganti sheet/DB.

---

### 2. Header atas (selalu terlihat saat data dimuat)

| Tombol / area | Fungsi |
|---------------|--------|
| **Menu** (☰, mobile) | Buka/tutup sidebar navigasi |
| **Project selector** | Ganti project |
| **User menu** (avatar kanan) | **Pengaturan project**, **Reset workspace**, **Keluar** |
| **Kelola Google Sheet** | Multi-sheet: tambah/hapus URL, merge, reload |
| **Refresh** | Muat ulang data dari sumber |
| **Sheet** (link eksternal) | Buka Google Sheet asli di tab baru |
| Baris error merah | Pesan gagal muat data |

---

### 3. Sidebar kiri (navigasi utama)

Bagian **Analyze** (butuh data sudah dimuat):
| Menu | ID view | Isi |
|------|---------|-----|
| **Overview** | overview | Dashboard widget kustom |
| **Charts** | charts | Galeri semua grafik auto-detect |
| **Data** | data | Tabel, kolom, insights |
| **Explore** | query | Filter visual tanpa SQL |

Bagian **Settings**:
| Menu | ID view | Isi |
|------|---------|-----|
| **Sources** | sources | Koneksi PostgreSQL + glosarium metric |
| **Audit Log** | audit | Riwayat aktivitas (**hanya Admin**) |

Footer sidebar: jumlah baris + label scope akses (jika aktif).

---

### 4. Overview — dashboard widget

**Overview kosong**
- Tombol **Add widget** → buka widget builder.
- Bagian **Start from a template**: template **KPI + chart**, **Table + donut**, **Executive pack** — klik untuk terapkan lalu edit.

**Overview sudah ada widget**
- Toolbar: **Share** (salin link dashboard), **Edit widgets** (buka builder).
- Hover widget → tombol **Edit** (pensil) di pojok kanan atas widget.
- Klik bagian grafik → **drill-through** (filter global ke kategori itu).

**Widget builder (modal "Edit dashboard")**
1. Daftar widget: tambah, duplikat, hapus, urutkan (chevron up/down).
2. **Tambah widget** → Langkah 1: pilih bentuk — **Big Number**, **Bar Chart**, **Line**, **Donut**, **Distribution**, **Top List**, **Data Table**.
3. Langkah 2: **Widget Data Configurator** — Group by, Calculate (agregasi), Filters, Sort & limit, Columns (tabel).
4. Panel kanan: **Live preview** — pratinjau sebelum simpan.
5. Simpan → layout auto-sync ke server.

**Bentuk widget**
- stat = angka besar (KPI)
- bar / line / donut / distribution = grafik
- ranking = daftar peringkat
- table = tabel dengan kolom pilihan

---

### 5. Charts (Grafik)

- Galeri kartu grafik dari semua kolom yang cocok divisualisasikan.
- Setiap kartu: ganti tipe grafik (ikon), expand/collapse.
- Klik segmen grafik → filter drill-through (sama seperti Overview).
- Kotak cari untuk filter judul grafik.

---

### 6. Data

Tab di dalam halaman Data:
| Tab | Fungsi |
|-----|--------|
| **Table** | Tabel interaktif semua baris (pagination). Viewer: PII disamarkan. |
| **Columns** | **Profil Kolom** — tipe, fill rate, sample |
| **Insights** | **Insight Otomatis** dari analyzer |

Panel tambahan: **Kualitas Data**, **Metrics** (simpan metric kustom — analyst/admin).

**Export CSV**
- Tombol export di area Data (hanya **Analyst** & **Admin**, bukan Viewer).

---

### 7. Explore (Cari Data) — tab "Explore" di sidebar

Judul halaman: **Cari Data** / panel **Cari Data**.

Cara pakai:
1. Buka sidebar → **Explore**.
2. Tambah **syarat filter** (+): pilih kolom, operator (equals, contains, greater than, …), nilai.
3. **Sort** opsional.
4. Hasil = baris yang cocok, tanpa menulis SQL.
5. Banner query aktif muncul jika filter explore dipakai — mempengaruhi data di view lain.

---

### 8. Sources

- **Sumber Data**: kelola koneksi PostgreSQL (tambah, tes koneksi, muat ke dashboard).
- **Glosarium Metrik**: definisi metric tersimpan.

Google Sheet diatur lewat **Pengaturan project** / wizard project, bukan hanya di Sources.

---

### 9. Filter global & drill-down

**Filter header (Active Filters Bar)**
- Muncul saat ada filter aktif di Overview/Charts/Data/Explore.
- Chip per filter — klik **×** pada chip untuk hapus satu filter.
- **Clear all** untuk reset semua.

**Drill-through**
- Klik batang/slice grafik → filter otomatis ke kategori yang diklik.

**Scope akses (role simulation)**
- Membatasi baris per dimensi (mis. cabang). Terlihat di sidebar footer.
- Data di chat & dashboard sudah terfilter scope.

---

### 10. Multi-sheet

Tombol **Kelola Google Sheet** di header:
- Tambah URL sheet lain.
- **Merge mode**: gabung beberapa sheet.
- **Reload** setelah ubah daftar sheet.

Juga bisa di dalam widget builder → panel **Multi-sheet**.

---

### 11. Auto-refresh & laporan

Bar **Auto-refresh** (di atas konten dashboard):
- Dropdown interval: **Mati**, **5 menit**, **15 menit**, **30 menit**.
- **Refresh sekarang** — muat ulang manual.

**Scheduled report** (jika tampil): jadwal refresh/ringkasan periodik.

---

### 12. AI Chat (kamu — tombol mengambang kanan bawah)

**Buka/tutup**
- Tombol bulat **robot + sparkles** pojok kanan bawah → panel chat.
- Header chat: **SheetVision AI** — "Query engine aktif · Angka dari kode".

**Kamu bisa**
- **Analisis data** — angka dari query engine (bukan tebakan).
- **Navigasi & filter** — actions set_view, set_filter, dll.
- **Widget proposal** — buat/ubah/hapus widget dengan **preview** + pertanyaan validasi.
- **Panduan aplikasi** — jawab cara pakai (seperti dokumen ini).

**Alur widget via chat**
1. User minta widget → kamu kirim widgetProposal + validationQuestion.
2. User klik **Lihat preview** → modal pop-out.
3. **Ya, terapkan** / **Belum sesuai — ubah lagi**.
4. Setelah terapkan: tombol **Batalkan** untuk undo layout.

**Edit natural widget**: "ubah widget batang jadi donut" → update + widgetRef.

**Tombol cepat di chat** (contoh): navigasi, filter, bantuan widget.

**Riwayat**: maks. 5 pesan per sheet — tombol **Hapus** untuk clear.

---

### 13. Role pengguna

| Role | Bisa | Tidak bisa |
|------|------|------------|
| **Viewer** | Lihat dashboard, chat analisis, explore | Export CSV, edit widget/layout, widget proposal |
| **Analyst** | + Export, SQL read-only (jika ada) | Audit log, sertifikasi metric |
| **Admin** | + Audit log, kelola metric certified | — |

---

### 14. Alur umum (cheat sheet)

**Mulai dari nol**
Login → Project baru → URL sheet / DB → Cek koneksi & muat data → Overview → Add widget atau template.

**Analisis cepat**
Explore (filter) ATAU tanya AI → Charts untuk visual → Data → Table untuk detail baris.

**Meeting / presentasi**
Overview + Share link + template Executive pack.

**Troubleshooting**
| Masalah | Solusi |
|---------|--------|
| Overview kosong | **Add widget** atau template |
| Data tidak muncul | **Cek koneksi & muat data** atau **Refresh** |
| Sheet gagal | Pastikan sheet publik; cek error merah di header |
| Tidak bisa export | Perlu role Analyst/Admin |
| Tidak bisa edit widget | Perlu Analyst/Admin; atau pakai AI chat (jika role允许) |
| Angka chat beda dengan sheet | Cek filter aktif & scope — chat pakai data yang terlihat sekarang |

---

### 15. Cara menjawab pertanyaan bantuan (instruksi untuk AI)

- Jawab **spesifik** sesuai halaman yang user tanyakan.
- Jika user di halaman X (lihat dashboardContext.activeView), prioritaskan instruksi untuk halaman itu.
- Tawarkan **suggestedFollowUps** kind "help" atau "navigate" — mis. "Buka Explore" dengan action set_view.
- Jangan panggil query tools untuk pertanyaan murni cara pakai (kecuali user juga minta angka).
- Jika user minta "buka X untuk saya" → sertakan action set_view + jelaskan singkat apa yang akan mereka lihat.
`.trim();

/** Petunjuk dinamis berdasarkan halaman aktif user */
export function buildActiveViewHelpHint(activeView: string): string {
  const hints: Record<string, string> = {
    overview:
      "User sedang di **Overview**. Jelaskan widget, Edit widgets, Add widget, template, Share, drill-through.",
    charts:
      "User sedang di **Charts**. Jelaskan galeri grafik, ganti tipe grafik, expand, drill-through, pencarian.",
    data: "User sedang di **Data**. Jelaskan tab Table/Columns/Insights, export CSV, kualitas data, metrics.",
    query:
      "User sedang di **Explore** (Cari Data). Jelaskan syarat filter visual, operator, sort — tanpa SQL.",
    sources:
      "User sedang di **Sources**. Jelaskan koneksi PostgreSQL, tes koneksi, glosarium metric.",
    audit: "User sedang di **Audit Log** (admin). Jelaskan riwayat aktivitas.",
  };
  return hints[activeView] ?? `User sedang di view "${activeView}".`;
}
