# Business Requirement Document (BRD)
## Platform Business Intelligence & Data Analytics — Sektor Perbankan

> **Konsep produk:** kapabilitas analitik dan monitoring yang kuat, dengan pengalaman pengguna yang terang, intuitif, dan berorientasi keputusan bisnis — disesuaikan untuk kebutuhan operasional, kredit, risiko, dan cabang perbankan.

| Atribut | Keterangan |
|---------|------------|
| **Nama Dokumen** | BRD — Platform BI & Data Analytics (Banking) |
| **Status** | Draft untuk Discovery dan Proof of Concept |
| **Versi** | 1.2 |
| **Tanggal** | 24 Juni 2026 |
| **Pemilik Dokumen** | Product Owner / Business Analyst *(diisi saat finalisasi)* |
| **Pemangku Kepentingan** | Business Owner, Data Owner, IT/Engineering, Risk & Compliance, Operations, Analyst, Manajemen Cabang |
| **Tujuan Dokumen** | Acuan ruang lingkup, kebutuhan, prioritas, dan kriteria penerimaan pengembangan platform |

> **Catatan:** Dokumen ini merumuskan kebutuhan target untuk lingkungan perbankan. Detail seperti sumber data prioritas (core banking, LOS, CRM), volume data, frekuensi pembaruan, peran pengguna, dan formula resmi KPI perlu dikonfirmasi pada tahap discovery sebelum desain teknis final.

**Implementasi awal (codebase):** [SheetVision](../README.md) — dashboard interaktif dari Google Sheet dengan AI assistant. PoC dimulai dari kapabilitas ini, lalu berkembang ke semantic layer, governance, dan integrasi sumber data perbankan.

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Visi Produk dan Sasaran](#2-visi-produk-dan-sasaran)
3. [Ruang Lingkup](#3-ruang-lingkup)
4. [Stakeholder dan Persona Pengguna](#4-stakeholder-dan-persona-pengguna)
5. [Prinsip Produk dan UX](#5-prinsip-produk-dan-ux)
6. [Arsitektur Konseptual](#6-arsitektur-konseptual)
7. [Kebutuhan Fungsional](#7-kebutuhan-fungsional)
8. [Kebutuhan Nonfungsional](#8-kebutuhan-nonfungsional)
9. [Governance, Keamanan, dan Akses Data](#9-governance-keamanan-dan-akses-data)
10. [Strategi Integrasi](#10-strategi-integrasi-grafana-metabase-atau-platform-sendiri)
11. [Skenario Proof of Concept](#11-skenario-proof-of-concept-banking)
12. [Roadmap Implementasi](#12-roadmap-implementasi)
13. [Risiko dan Mitigasi](#13-risiko-dan-mitigasi)
14. [Kriteria Penerimaan](#14-kriteria-penerimaan-awal)
15. [Keputusan Terbuka dan Riset Lanjutan](#15-keputusan-terbuka-dan-riset-lanjutan)
- [Lampiran A — Glosarium](#lampiran-a--glosarium)
- [Lampiran B — Referensi Teknis](#lampiran-b--referensi-teknis)

---

## 1. Pendahuluan

### 1.1 Latar Belakang

Institusi perbankan membutuhkan cara yang lebih cepat dan terpercaya untuk mengubah data operasional — portofolio kredit, kinerja cabang, transaksi, data risiko, spreadsheet ad-hoc, database operasional, dan telemetri perangkat (ATM, sensor cabang) — menjadi informasi yang dapat dipahami serta ditindaklanjuti.

Kondisi saat ini umumnya masih mengandalkan:

- Laporan manual atau spreadsheet terdistribusi antar divisi
- Dashboard yang tidak fleksibel untuk analisis mandiri oleh bisnis
- Definisi KPI yang berbeda antar unit (kredit, risiko, cabang, finance)
- Waktu lama untuk menjawab pertanyaan sederhana dari manajemen

Produk yang akan dibangun diarahkan sebagai **platform Business Intelligence (BI) dan Data Analytics** yang mampu:

- Mengintegrasikan beragam sumber data perbankan
- Mengolah data menjadi **metric resmi** yang konsisten
- Menyajikan dashboard interaktif dengan UX yang ramah pengguna bisnis

Platform mengambil inspirasi dari kekuatan **Grafana** (monitoring, visualisasi, transformasi, alerting) dan **Metabase** (self-service analytics, query builder, metric, data exploration), dengan pengalaman pengguna yang lebih terang, kontekstual, dan berorientasi keputusan bisnis perbankan.

### 1.2 Permasalahan yang Ingin Diselesaikan

| # | Permasalahan |
|---|--------------|
| P-01 | Data tersebar di core banking, LOS, CRM, spreadsheet cabang, dan sistem pendukung — tanpa definisi metric yang seragam |
| P-02 | Pengguna bisnis (manajer cabang, credit analyst) bergantung pada tim IT/data untuk laporan rutin |
| P-03 | Formula bisnis (NPL, DPD, approval rate, outstanding) bisa berbeda antar file/dashboard |
| P-04 | Dashboard hanya menampilkan angka, belum membantu investigasi penyebab atau tindakan lanjutan |
| P-05 | Data perangkat/ATM/sensor cabang belum terintegrasi untuk monitoring near real-time dan alerting |
| P-06 | Data sensitif (NIK, rekening, saldo nasabah) membutuhkan kontrol akses ketat sejak awal |

### 1.3 Tujuan Dokumen

- Mendefinisikan kebutuhan produk dari sisi bisnis, data, analitik, visualisasi, keamanan, dan UX — konteks perbankan
- Menentukan batas MVP, PoC, serta roadmap jangka menengah
- Memberikan dasar evaluasi pendekatan: embed BI tool, komponen tertentu, atau platform mandiri
- Menetapkan kriteria keberhasilan yang dapat diuji secara objektif

---

## 2. Visi Produk dan Sasaran

### 2.1 Visi Produk

> Menyediakan **workspace analitik terpadu** yang memungkinkan manajemen, analis kredit, tim risiko, dan operasional cabang memahami data, menyusun metric terpercaya, membangun dashboard, memantau perubahan, dan mengambil keputusan — tanpa selalu bergantung pada SQL atau tim teknis.

### 2.2 Sasaran Utama

| Sasaran | Indikator Keberhasilan Awal |
|---------|----------------------------|
| **Self-service analytics** | Manajer cabang/analis dapat menjawab pertanyaan sederhana via visual builder atau AI tanpa engineer |
| **Konsistensi metric** | KPI resmi (NPL, DPD, outstanding, approval rate) sebagai single source of truth |
| **Kecepatan insight** | Dari pertanyaan ke visualisasi dalam satu workspace dan satu alur kerja |
| **Monitoring operasional** | Kondisi kritis (ATM down, data stale, NPL spike) terpantau; alert saat melewati threshold |
| **Keamanan data** | Akses dibatasi per role, cabang, region, dan field sensitif |
| **UX yang jelas** | Bahasa bisnis perbankan, template dashboard, rekomendasi chart, konteks pada setiap metric |

### 2.3 Prinsip Keberhasilan

1. **Angka dapat dipercaya** — setiap metric punya definisi, sumber, pemilik, dan waktu pembaruan yang jelas
2. **Eksplorasi, bukan hanya tampilan** — filter, drill-down, drill-through ke detail nasabah/fasilitas *(sesuai izin)*
3. **Aman secara default** — koneksi read-only, least privilege, masking data sensitif
4. **Berkembang bertahap** — Google Sheets untuk PoC; arsitektur tidak mengunci pada spreadsheet
5. **Mendukung keputusan** — ringkasan dulu, konteks berikutnya, detail saat dibutuhkan

---

## 3. Ruang Lingkup

### 3.1 Ruang Lingkup Dalam

| Area | Cakupan |
|------|---------|
| **Integrasi data** | Database relasional, Google Sheets, CSV/XLSX (bila disetujui), API/core banking read replica, data perangkat via indirect/direct |
| **Pengolahan data** | Validasi, transformasi, join, agregasi, calculated field, metric, formula komposit, pre-aggregation |
| **Data exploration** | Dataset catalog, visual query builder, SQL editor (role berwenang), query tersimpan, preview |
| **AI analytics** | Natural language to query, rekomendasi visualisasi, penjelasan metric, guardrail |
| **Dashboard** | Widget, chart, KPI card, filter, drill-down, template per persona, sharing, embedding terkontrol |
| **Monitoring & action** | Threshold, alert, annotation, scheduled report, notifikasi |
| **Governance** | Role, row/column-level access, audit log, metric approval, lineage, data quality status |

### 3.2 Di Luar Ruang Lingkup Awal

- Penggantian core banking / LOS / sistem sumber yang sudah ada
- Transaksi tulis langsung dari interface analitik ke database produksi
- Data warehouse enterprise skala besar sebelum volume dan latency tervalidasi
- Model prediktif/ML kredit tanpa dataset, tujuan, dan evaluasi yang disepakati
- Pembangunan infrastruktur ATM/perangkat IoT dari nol

### 3.3 Asumsi Awal

| Kode | Asumsi | Dampak |
|------|--------|--------|
| **A-01** | Sebagian data operasional/cabang masih di Google Sheets atau export manual | Konektor Sheets dan validasi struktur kolom prioritas MVP |
| **A-02** | Data perangkat (ATM, sensor) mungkin masih direkap di sheet atau DB staging | PoC indirect: device → sheet/DB → platform |
| **A-03** | Literasi data pengguna bisnis beragam | Visual builder, template, glossary, Ask AI sebagai pengalaman utama |
| **A-04** | Data nasabah dan portofolio bersifat sensitif; akses per cabang/region wajib | RBAC + row/column security sejak awal, bukan fitur belakangan |
| **A-05** | Regulasi dan kebijakan internal membatasi export dan retensi data | Audit log, masking, dan kebijakan export mengikuti compliance |

---

## 4. Stakeholder dan Persona Pengguna

### 4.1 Persona

| Persona | Kebutuhan Utama | Kemampuan Sistem |
|---------|-----------------|------------------|
| **Direksi / Business Owner** | KPI portofolio, NPL, pertumbuhan, risiko — tanpa detail teknis | Executive dashboard, perbandingan periode, alert ringkas, report terjadwal |
| **Regional / Branch Manager** | Kinerja cabang, pipeline kredit, kolektibilitas, tindakan korektif | Filter cabang, drill-down produk/RM, threshold, annotation |
| **Credit Analyst / RM** | Analisis fasilitas, approval rate, outstanding per segmen | Catalog, query builder, formula, saved analysis, dashboard builder |
| **Risk Officer / Metric Owner** | Definisi NPL, DPD, formula resmi, konsistensi laporan | Approval metric, versioning, lineage, certified metric |
| **IT / Data Engineer** | Koneksi aman, performa, integrasi core/LOS | Data source admin, sync log, query monitoring, audit |
| **Viewer (Operasional)** | Jawaban cepat sesuai peran dan cabang | Dashboard terpersonalisasi, Ask AI, filter terbatas, export sesuai izin |

### 4.2 Peran Sistem

| Role | Hak Akses Inti |
|------|----------------|
| **Viewer** | Lihat dashboard yang diizinkan, filter, drill-down, export terbatas |
| **Analyst** | Buat analisis pribadi, query, visualisasi, draft dashboard |
| **Editor** | Ubah dan publish dashboard bersama dalam workspace yang diizinkan |
| **Metric Owner** | Buat, usulkan, setujui, dan cabut status metric resmi |
| **Data Admin** | Kelola sumber data, dataset, mapping, katalog, kebijakan akses |
| **Super Admin** | Konfigurasi global, organisasi, audit, kebijakan keamanan *(SSO hanya fase enterprise — lihat §9)* |

---

## 5. Prinsip Produk dan UX

### 5.1 Positioning UX

Platform tidak boleh terasa seperti ruang monitoring teknis yang padat. Tampilan kuat untuk analyst, tetapi memberi jalur mudah bagi manajer cabang dan bisnis.

**Prinsip:** *"Ringkasan dulu, konteks berikutnya, detail saat dibutuhkan."*

| Prinsip | Implementasi UX |
|---------|-----------------|
| Berorientasi pertanyaan | Home: Ask AI, Explore Data, Create Dashboard, Monitor Alerts |
| Bahasa bisnis | "Outstanding Kredit", "Rasio NPL", "Data Terakhir Diperbarui" — bukan nama tabel mentah |
| Guided creation | Saran metric, dimensi, dan chart sesuai tipe data (waktu, kategori, nilai) |
| Visual terang & fokus | Latar netral, aksen terbatas; merah/kuning/hijau untuk status risiko |
| Progresif | SQL, schema, lineage hanya untuk role yang membutuhkan |
| Konsisten | Setiap widget: judul, definisi metric, filter aktif, sumber, waktu update |

### 5.2 Struktur Navigasi Utama

| Menu | Tujuan | Elemen Kunci |
|------|--------|--------------|
| **Home** | Pintu masuk per persona | KPI ringkas, recent dashboards, alerts, Ask AI |
| **Explore Data** | Analisis dataset | Catalog, field list, visual query builder, preview |
| **Dashboards** | Lihat & bangun dashboard | Template (Eksekutif, Cabang, Kredit), builder, sharing |
| **Metrics** | Kelola definisi angka | Metric library, formula, owner, status certified |
| **Monitor** | Alert & freshness | Alert rule, threshold, notifications, data quality |
| **Admin** | Konfigurasi sistem | Data sources, kebijakan akses, audit, jobs *(tanpa manajemen user/login di PoC)* |

### 5.3 Ketentuan Visualisasi

- KPI card: nilai utama, satuan (IDR, %), periode, perubahan vs pembanding, status target
- Chart: palet status konsisten; tidak mengandalkan warna semata
- Empty, error, dan data freshness state yang jelas
- Tabel: sorting, filter, pencarian, pagination, export sesuai izin, drill-through
- Dashboard builder: grid responsif, drag-and-drop, template awal per use case banking

---

## 6. Arsitektur Konseptual

Arsitektur berlapis agar penggantian sumber data, pertumbuhan volume, dan penambahan AI tidak memaksa perubahan besar pada antarmuka dashboard.

| Lapisan | Komponen | Tanggung Jawab |
|---------|----------|----------------|
| **1. Source** | Core read replica, Google Sheets, CSV, API LOS/CRM, IoT gateway | Data mentah operasional |
| **2. Ingestion & Sync** | Connectors, scheduler, webhook/stream, mapping, sync log | Tarik data, kenali schema, jadwalkan refresh |
| **3. Data Processing** | Staging, validasi, transform, join, aggregation | Siapkan data untuk analisis |
| **4. Semantic & Governance** | Catalog, dimensions, measures, metrics, lineage | Istilah bisnis & konsistensi perhitungan |
| **5. Query & AI** | Visual builder, SQL service, guardrail, NL-to-query | Query aman & dapat dijelaskan |
| **6. Presentation** | Dashboard, widgets, charts, filters, reports | Sajikan insight |
| **7. Monitoring & Security** | Alerts, audit, RBAC, row/column policy | Keamanan & tindak lanjut |

### 6.1 Alur Data Target

```
Sumber Data → Konektor/Sinkronisasi → Staging & Validasi → Dataset/Semantic Layer → Query/AI → Visualisasi/Alert/Report
```

### 6.2 Pola Integrasi IoT / Perangkat

| Pola | Alur | Kapan | Catatan |
|------|------|-------|---------|
| **Indirect (PoC)** | ATM/sensor → Sheet atau DB staging → platform | Data sudah direkap, volume rendah | Cepat validasi use case |
| **Direct (Target)** | Device → API/MQTT → time-series store → platform | Near real-time, alert kritis | Perlu gateway, schema event, keamanan |

> **Keputusan awal:** PoC gunakan jalur paling tersedia (kemungkinan Google Sheets). Kontrak data dan semantic layer dirancang agar migrasi ke DB/core tidak mengubah dashboard pengguna.

---

## 7. Kebutuhan Fungsional

Kode kebutuhan sebagai dasar backlog. **MVP** = versi pertama yang diuji. **Phase 2** = setelah PoC tervalidasi.

### 7.1 Integrasi Sumber Data

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-DS-01 | Admin menambah koneksi database read-only; kredensial disimpan aman | MVP |
| FR-DS-02 | Baca Google Sheets: tab, header, tipe data, waktu perubahan | MVP |
| FR-DS-03 | Impor CSV/XLSX sebagai dataset terkelola (jika kebijakan mengizinkan) | MVP |
| FR-DS-04 | Sync manual & terjadwal; log waktu, status, jumlah baris, error | MVP |
| FR-DS-05 | Status freshness: kapan terakhir update, apakah melewati SLA | MVP |
| FR-DS-06 | Jalur direct IoT/API dengan identitas perangkat, timestamp, retry | Phase 2 |
| FR-DS-07 | Deteksi perubahan schema (kolom hilang, tipe berubah) | Phase 2 |

### 7.2 Kualitas Data, Transformasi, dan Dataset

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-DP-01 | Profil data: jumlah baris, null, duplikasi, rentang, kategori | MVP |
| FR-DP-02 | Aturan validasi: field wajib, rentang, format, uniqueness | MVP |
| FR-DP-03 | Dataset dari join, filter, rename, type casting, deduplikasi | MVP |
| FR-DP-04 | Transformasi terjadwal dengan status eksekusi | Phase 2 |
| FR-DP-05 | Metadata dataset: owner, sumber, refresh policy, field sensitif | MVP |
| FR-DP-06 | Lineage sederhana: source → transform → dataset → metric → dashboard | Phase 2 |

### 7.3 Semantic Layer dan Formula

Semantic layer menerjemahkan data teknis ke istilah bisnis perbankan — agar NPL, outstanding, dan DPD dihitung sama di seluruh dashboard.

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-SM-01 | Tandai field: dimension, measure, date, identifier, PII/sensitif | MVP |
| FR-SM-02 | Calculated field level baris dengan formula tervalidasi | MVP |
| FR-SM-03 | Aggregated metric: SUM, COUNT, AVG, ratio, percentile | MVP |
| FR-SM-04 | Composite metric dari metric lain + dependensi | MVP |
| FR-SM-05 | Metric: nama bisnis, formula, owner, Draft/Certified/Deprecated, satuan | MVP |
| FR-SM-06 | Versioning & approval formula; tandai dashboard terdampak | Phase 2 |

#### Contoh Formula untuk PoC (Banking)

| Tipe | Contoh | Catatan |
|------|--------|---------|
| **Calculated field** | `Total_Tunggakan = Pokok_Tertunggak + Bunga_Tertunggak` | Per fasilitas |
| **Calculated field** | `Flag_NPL = IF(DPD_Hari >= 90, 1, 0)` | Aturan DPD wajib dikonfirmasi Risk |
| **Composite metric** | `Outstanding_NPL = SUM(Outstanding) WHERE Flag_NPL = 1` | |
| **Aggregate metric** | `Rasio_NPL = Outstanding_NPL / Total_Outstanding` | Format persen |
| **Aggregate metric** | `AVG(Plafond) GROUP BY Kantor_Cabang` | Kinerja cabang |

> **Wajib dikonfirmasi:** definisi DPD (hari kalender vs bisnis), treatment restrukturisasi, write-off, pembulatan, dan pemilik metric resmi.

#### Contoh Query

```sql
SELECT
  Kantor_Cabang,
  AVG(Plafond) AS Rata_Plafond,
  SUM(Outstanding) AS Total_Outstanding,
  SUM(Flag_NPL) / COUNT(*) AS Rasio_NPL
FROM Portofolio_Kredit
WHERE Periode = '2026-Q2'
GROUP BY Kantor_Cabang
ORDER BY Total_Outstanding DESC
```

### 7.4 Query Dinamis dan Data Exploration

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-Q-01 | Pilih dataset, field, filter, group by, agregasi, sort, limit, visual — tanpa SQL | MVP |
| FR-Q-02 | Rekomendasi chart berdasarkan tipe hasil query | MVP |
| FR-Q-03 | SQL editor read-only: schema terbatas, timeout, row limit, history | MVP |
| FR-Q-04 | Simpan query sebagai analysis/question; pakai ulang di dashboard | MVP |
| FR-Q-05 | Preview hasil, metadata, waktu eksekusi, error yang jelas | MVP |
| FR-Q-06 | Query explain / rekomendasi optimasi untuk admin | Phase 2 |

### 7.5 Natural Language to Query (AI Analytics)

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-AI-01 | Pertanyaan bahasa sehari-hari, mis. *"Tampilkan outstanding per cabang bulan ini"* | MVP |
| FR-AI-02 | Identifikasi dataset, metric, dimensi, filter waktu, jenis visual | MVP |
| FR-AI-03 | Tampilkan interpretasi, formula/metric, query, preview hasil | MVP |
| FR-AI-04 | AI hanya pada dataset/metric yang diizinkan; tidak query tulis | MVP |
| FR-AI-05 | Koreksi cepat: ganti periode, metric, grouping | MVP |
| FR-AI-06 | Feedback sesuai/tidak sesuai untuk evaluasi kualitas | Phase 2 |

#### Guardrail AI

- Konteks utama: catalog, glossary, certified metric — bukan tebak nama kolom mentah
- Eksekusi via query service (bukan kredensial DB langsung); row limit & timeout
- Audit log prompt/hasil sesuai kebijakan privasi perbankan
- Confidence rendah → tampilkan asumsi, minta pilihan interpretasi
- Tidak tampilkan data di luar cakupan akses; tidak klaim sebab-akibat tanpa dasar data
- **Tidak mengirim PII mentah ke model** tanpa masking/kebijakan eksplisit

### 7.6 Dashboard, Widget, dan Visualisasi

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-V-01 | Dashboard dari template atau halaman kosong | MVP |
| FR-V-02 | Grid, drag-and-drop, resize, alignment, preview | MVP |
| FR-V-03 | Widget: KPI, table, bar, line, area, pie, scatter, gauge, heatmap, text | MVP |
| FR-V-04 | Widget: judul, metric, filter, format IDR/%, sumber, freshness | MVP |
| FR-V-05 | Global filter, cascading filter, saved view | MVP |
| FR-V-06 | Cross-filter, drill-down, drill-through ke detail fasilitas | MVP |
| FR-V-07 | Perbandingan periode dan target/threshold KPI | Phase 2 |
| FR-V-08 | Embedding terkontrol dengan autentikasi sama | Phase 2 |

### 7.7 Alerting, Annotation, dan Reporting

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-M-01 | Alert threshold: NPL naik, outstanding turun drastis, data stale | MVP |
| FR-M-02 | Channel: email / aplikasi komunikasi internal | MVP |
| FR-M-03 | Konteks alert: rule, nilai aktual, threshold, link dashboard | MVP |
| FR-M-04 | Annotation pada timeline (kebijakan kredit, gangguan sistem) | Phase 2 |
| FR-M-05 | Scheduled report ke penerima sesuai hak akses | Phase 2 |
| FR-M-06 | Riwayat alert, acknowledgement, tindak lanjut | Phase 2 |

### 7.8 Kolaborasi dan Administrasi

| ID | Kebutuhan | Prioritas |
|----|-----------|-----------|
| FR-C-01 | Bagikan dashboard per user, group, role, workspace | MVP |
| FR-C-02 | Komentar pada dashboard/widget | Phase 2 |
| FR-C-03 | Audit: akses dashboard, ubah formula, publish, export, query SQL *(tanpa event login)* | MVP |
| FR-C-04 | Monitor job sync, query lambat, error, penggunaan dashboard | MVP |
| FR-C-05 | Kelola template, glossary, katalog, status metric resmi | MVP |

---

## 8. Kebutuhan Nonfungsional

> Angka target usulan — disepakati saat technical discovery.

| Kategori | Kebutuhan / Target |
|----------|-------------------|
| **Kinerja** | Dashboard ≤10 widget: P95 tampil ≤5 detik; filter P95 ≤3 detik; query ad hoc dengan timeout jelas |
| **Skalabilitas** | Query, worker sync, alert engine, frontend diskalakan terpisah |
| **Ketersediaan** | Target awal 99,5% untuk layanan produksi |
| **Keamanan** | TLS, enkripsi secret, read-only connector, least privilege, audit log |
| **Privasi** | Klasifikasi field sensitif; masking NIK/rekening; row/column policy |
| **Keandalan data** | Status sync, freshness, gagal transform, perubahan schema terpantau |
| **Aksesibilitas** | Kontras, keyboard, label jelas, tidak hanya warna |
| **Kompatibilitas** | Browser desktop modern; tablet/mobile untuk konsumsi dashboard |
| **Lokalisasi** | UI Bahasa Indonesia; format IDR, zona waktu WIB |
| **Observability** | Log terstruktur, health check, metrics internal |
| **Maintainability** | Konektor & visualisasi modular; dokumentasi API; version control config |

---

## 9. Governance, Keamanan, dan Akses Data

### 9.0 Kebijakan Tanpa Login (PoC & Pilot Terbatas)

**Keputusan produk:** SheetVision **tidak memerlukan login** pada tahap PoC dan pilot terbatas. Autentikasi SSO/OIDC ditunda ke fase enterprise (Tahap 4).

| Aspek | Implementasi PoC/Pilot |
|-------|------------------------|
| **Peran pengguna** | Simulasi via pemilih role di UI (Viewer / Analyst / Admin) — tersimpan di browser |
| **Scope cabang/region** | Filter baris per dimensi + parameter URL `scopeCol` / `scopeVal` untuk berbagi dashboard |
| **PII** | Masking kolom sensitif untuk role Viewer (client + server) |
| **SQL** | Hanya role Analyst/Admin; read-only, timeout, row limit |
| **Audit** | Event operasional (load, filter, export, query) — tanpa event login |
| **Batasan** | Role bersifat simulasi demo; untuk produksi wajib SSO + kebijakan server yang mengikat identitas |

> Pilot internal dapat berjalan tanpa akun pengguna selama akses sheet/URL dibatasi organisasi (link privat, VPN, atau sheet tidak publik).

### 9.1 Prinsip Akses Data

- **PoC/Pilot:** tidak ada login; authorization via **role simulator** + **data scope** + **data policy di API**
- **Produksi (Tahap 4):** SSO/OIDC/SAML organisasi bila tersedia — menggantikan role simulator
- Authorization: role + atribut data (contoh: manager cabang Jakarta hanya lihat data cabang Jakarta)
- Kebijakan akses di lapisan query/data policy, bukan hanya sembunyikan widget
- SQL native hanya role tertentu, read-only via query service
- Export mengikuti kebijakan field/row yang sama dengan tampilan
- Perubahan konektor, formula resmi, role simulator, scope, export → audit log

### 9.2 Lifecycle Metric

| Status | Makna | Aktor |
|--------|-------|-------|
| **Draft** | Dibuat/diubah, belum resmi | Analyst / Metric Owner |
| **In Review** | Formula diperiksa bisnis/risk | Metric Owner / Reviewer |
| **Certified** | Metric resmi organisasi | Metric Owner |
| **Deprecated** | Tidak untuk kebutuhan baru; histori tetap ada | Metric Owner / Data Admin |

### 9.3 Data Quality Status

| Status | Interpretasi | Aksi Sistem |
|--------|--------------|-------------|
| **Healthy** | Data tersedia, validasi lolos, freshness OK | Status normal |
| **Warning** | Keterlambatan, null meningkat, rule minor gagal | Warning + link detail |
| **Critical** | Sync gagal, data sangat terlambat, rule penting gagal | Alert ke owner + label dashboard |
| **Unknown** | Belum dikonfigurasi | Info setup diperlukan |

---

## 10. Strategi Integrasi: Grafana, Metabase, atau Platform Sendiri

Keputusan tidak harus biner. Platform dapat **hybrid**: frontend & governance sendiri, komponen BI selektif untuk percepat delivery.

| Pendekatan | Kelebihan | Keterbatasan | Kesesuaian Banking |
|------------|-----------|--------------|-------------------|
| **Embed Grafana** | Monitoring, time series, alerting kuat | UX BI bisnis & semantic layer butuh banyak custom | Monitoring ATM/IoT, operasional teknis |
| **Embed Metabase** | Query builder, self-service, metric, dashboard bisnis | Embedding/security granular bergantung edition | Analisis portofolio & cabang |
| **Bangun dari nol** | Kontrol penuh UX & governance | Biaya & kompleksitas tinggi | Diferensiasi jangka panjang |
| **Hybrid** *(direkomendasikan)* | UX + governance custom; engine selektif | Perlu batas integrasi jelas | PoC → produk jangka panjang |

### Rekomendasi Arah

Mulai **hybrid**. Bangun UX, data catalog, metric governance, access policy, dan Ask AI sebagai inti. PoC: konektor Google Sheets + library chart (SheetVision). **Tanpa login** pada PoC; role & scope sebagai simulasi akses. Hindari embed pihak ketiga tanpa konsistensi metadata dan kebijakan data.

---

## 11. Skenario Proof of Concept (Banking)

### 11.1 Tujuan PoC

Membuktikan bahwa data portofolio kredit (dari Google Sheet dummy) dapat:

- Terintegrasi dan diprofilkan
- Dirumuskan dengan formula konsisten (NPL, outstanding, DPD)
- Divisualisasikan oleh user nonteknis dan via Ask AI
— tanpa ketergantungan penuh pada engineer.

### 11.2 Dataset Dummy — Portofolio Kredit

Dataset contoh untuk development dan demo. **Semua data fiktif.**

**File tunggal (2 tab):** [`docs/sample-data/Portofolio_Banking_Dummy.xlsx`](sample-data/Portofolio_Banking_Dummy.xlsx)

| Tab | Isi |
|-----|-----|
| `Portofolio_Kredit` | ~220 baris fasilitas aktif — 8 region, 36 cabang, 3 periode |
| `Pengajuan_Kredit` | ~200 baris pipeline pengajuan — funnel, SLA, channel |

| Field | Contoh | Peran | Sensitif |
|-------|--------|-------|----------|
| `No_Fasilitas` | F-2026-00001 | Identifier | — |
| `Nama_Nasabah` | PT Surya Maju *(fiktif)* | Informasi | PII — masking di Viewer |
| `Kantor_Cabang` | Cabang Jakarta Pusat | Dimension | — |
| `Region` | Jabotabek | Dimension | — |
| `Produk` | KMK / KPR / KTA / KKS / KBG / KKI | Dimension | — |
| `Segmen` | Korporasi / Ritel / UMKM | Dimension | — |
| `RM` | Budi Santoso | Dimension | — |
| `Tanggal_Akuisisi` | 2025-08-15 | Date | — |
| `Plafond` | 500000000 | Measure (IDR) | — |
| `Outstanding` | 320000000 | Measure (IDR) | — |
| `Pokok_Tertunggak` | 15000000 | Measure (IDR) | — |
| `Bunga_Tertunggak` | 2500000 | Measure (IDR) | — |
| `DPD_Hari` | 45 | Measure | — |
| `Kolektibilitas` | 2 | Dimension (1–5) | — |
| `Status` | Aktif / Lunas / Write-off | Dimension | — |
| `Periode_Laporan` | 2026-Q2 | Dimension / Filter | — |

### 11.2.1 Sheet Kedua — Pipeline Pengajuan Kredit

Tab `Pengajuan_Kredit` dalam file Excel yang sama (lihat tabel di atas). ~200 baris, data fiktif.

| Field | Contoh | Peran |
|-------|--------|-------|
| `No_Pengajuan` | P-2026-00001 | Identifier |
| `Tanggal_Pengajuan` | 2025-11-29 | Date |
| `Nama_Nasabah` | PT Nusa Kimia | Informasi / PII |
| `Kantor_Cabang` | Cabang Bogor | Dimension |
| `Region` | Jawa Barat | Dimension |
| `Produk` | KBG | Dimension |
| `Segmen` | Korporasi | Dimension |
| `RM` | Hendra Gunawan | Dimension |
| `Channel` | Partnership / Digital / Walk-in | Dimension |
| `Plafond_Diajukan` | 1000000000 | Measure (IDR) |
| `Jangka_Waktu_Bulan` | 36 | Measure |
| `Skor_Kredit` | 583 | Measure |
| `Risk_Grade` | Low / Medium / High | Dimension |
| `Status_Pengajuan` | Submitted → Disbursement / Rejected | Dimension |
| `Tanggal_Keputusan` | 2026-02-15 | Date |
| `SLA_Hari` | 4 | Measure |
| `SLA_Status` | On Track / Warning / Breach | Dimension |
| `Alasan_Penolakan` | Skor kredit di bawah kebijakan | Informasi |
| `No_Fasilitas_Referensi` | F-2026-00042 | Link ke sheet portofolio |
| `Periode_Laporan` | 2026-Q2 | Filter |

**Relasi antar sheet:** `No_Fasilitas_Referensi` pada pengajuan yang Approved/Disbursement mengacu ke `No_Fasilitas` di tab portofolio (untuk analisis funnel dan conversion rate).

### 11.3 Formula dan Dashboard PoC

| Komponen | Implementasi PoC |
|----------|------------------|
| **Data source** | Upload [`Portofolio_Banking_Dummy.xlsx`](sample-data/Portofolio_Banking_Dummy.xlsx) ke Google Sheets → otomatis jadi 2 tab: `Portofolio_Kredit` + `Pengajuan_Kredit` |
| **Formula** | `Total_Tunggakan`, `Flag_NPL`, `Outstanding_NPL`, `Rasio_NPL`, `Approval_Rate` = Approved+Disbursement / Total Pengajuan |
| **Dashboard Eksekutif** | Total outstanding, rasio NPL, cabang tertinggi/terendah, jumlah fasilitas, data freshness |
| **Dashboard Cabang** | Outstanding per produk, distribusi kolektibilitas, top RM by outstanding, filter cabang/region |
| **Dashboard Kredit** | Trend outstanding, funnel pengajuan per status, approval rate per channel, SLA breach |
| **Ask AI** | *"Tampilkan total outstanding per cabang pada kuartal ini"* → metric + penjelasan + chart |
| **Alert** | Data belum di-update >24 jam; rasio NPL region melewati threshold; DPD rata-rata naik |

### 11.4 Kriteria Keberhasilan PoC

- [ ] Satu Google Sheet terhubung, diprofilkan, disinkronkan — status terlihat user
- [ ] Minimal 3 formula banking disimpan dan dipakai ulang di ≥2 visualisasi
- [ ] User nonteknis membuat chart outstanding per cabang via visual builder
- [ ] Prompt NL menghasilkan query aman, visual sesuai, penjelasan metric
- [ ] Filter cabang/region/produk, drill-through ke detail fasilitas, freshness indicator
- [ ] Viewer cabang A tidak melihat data cabang B (skenario uji)
- [ ] Stakeholder: alur lebih mudah dari spreadsheet manual saat ini

### 11.5 Template Prompt Ask AI (Banking)

```
Tampilkan rasio NPL per region untuk periode 2026-Q2
Berapa total outstanding produk KPR di cabang Bandung?
Fasilitas mana yang DPD-nya di atas 90 hari?
Bandingkan outstanding Korporasi vs Ritel per bulan
```

---

## 12. Roadmap Implementasi

| Tahap | Fokus | Output | Estimasi |
|-------|-------|--------|----------|
| **0. Discovery** | Use case banking, data inventory, formula KPI, security, PoC scope | Product brief, data catalog, ADR, backlog | 2–4 minggu |
| **1. PoC / MVP** | Sheets connector, catalog, metric, dashboard, scope/role simulator, Ask AI, mock DB | Dashboard trial, laporan PoC | ✅ SheetVision |
| **2. Foundation** | Data policy server-side, audit persisten, metric glossary, auto-refresh, alerting | Produk lintas tim + governance tanpa login | **← tahap aktif** |
| **3. Scale & IoT** | Direct ingestion, time-series, refresh tinggi, anomaly detection | Monitoring ATM/operasional near real-time | — |
| **4. Enterprise** | Multi-tenant, **SSO opsional**, approval metric lengkap, compliance audit | Platform skala enterprise | — |

> Estimasi indikatif — bukan komitmen final sebelum scope, tim, dan integrasi ditetapkan.

### Gap: SheetVision Saat Ini → PoC Banking

| Sudah ada (v1.2) | Tahap 2 Foundation (berikutnya) |
|------------------|--------------------------------|
| Koneksi Google Sheet + mock DB | Staging/read replica konektor |
| Dataset catalog, metadata, freshness | Lineage kolom → sumber |
| Metric auto-detect + tersimpan/certify | Metric glossary resmi + workflow review |
| Drill-through, template layout | Scheduled report & export terjadwal |
| AI guardrail (sumber, asumsi) | Certified-metric-only mode untuk AI |
| Scope URL + role simulator (tanpa login) | Data policy server-side penuh |
| SQL read-only, audit dasar | Audit persisten (Redis) |
| Multi-sheet join + periode delta | Transform terjadwal, data quality rules |

### Gap: Foundation → Enterprise (tanpa login sampai Tahap 4)

| Sudah ada | Perlu untuk enterprise |
|-----------|------------------------|
| Role simulator | SSO/OIDC + identitas pengguna |
| Scope via URL | Row policy terikat identitas & grup |
| Audit in-memory/Redis | Audit compliance + retensi |

---

## 13. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Definisi NPL/DPD belum seragam | Angka berbeda, kepercayaan turun | Metric Owner, glossary, Certified, approval |
| Ketergantungan Google Sheets | Refresh lambat, schema berubah | Sheets untuk PoC; siapkan staging/DB |
| AI salah interpretasi prompt kredit | Insight menyesatkan | Asumsi, query, preview; certified metric only |
| Akses data longgar | Kebocoran data nasabah | Scope + masking PII + policy API; SSO di Tahap 4 |
| Query mahal ke core banking | Beban DB produksi | Read replica, limit, cache, pre-aggregation |
| Embed tool tanpa governance | Permission ganda, biaya licensing | ADR, kebijakan data unified; SSO di Tahap 4 |
| Terlalu banyak dashboard | User kewalahan | Template per persona, KPI owner, review berkala |

---

## 14. Kriteria Penerimaan Awal

Sistem siap **pilot terbatas** jika:

1. Data dari ≥1 Google Sheet dan ≥1 sumber uji (DB mock) tampil dengan status sync & freshness
2. Dataset terkelola dengan metadata; field ditandai dimension/measure/sensitif
3. Calculated field & metric agregat disimpan dan dipakai ulang di banyak dashboard
4. Analyst membangun visualisasi outstanding per cabang tanpa SQL
5. Role Analyst memakai SQL read-only dengan timeout & row limit *(tanpa login)*
6. Ask AI menerjemahkan prompt PoC ke query + chart + penjelasan metric
7. Viewer terbatas hanya lihat baris/kolom sesuai skenario cabang *(via scope + role simulator)*
8. Dashboard: filter, drill-down/through, error state, freshness
9. Audit log: perubahan formula, dashboard, sync gagal, export
10. Stakeholder setuju UI dapat dipahami tanpa pelatihan teknis panjang

---

## 15. Keputusan Terbuka dan Riset Lanjutan

| No. | Keputusan | Pertanyaan Kunci | Output |
|-----|-----------|------------------|--------|
| 1 | **Sumber data produksi** | Core banking, LOS, CRM — mana prioritas PoC? Read replica tersedia? | Data catalog & mapping |
| 2 | **Formula resmi KPI** | Definisi NPL, DPD, kolektibilitas, write-off, restrukturisasi? | Glossary & certified metrics |
| 3 | **Security model** | Akses per cabang, region, PII — **tanpa login di PoC** | ✅ Role simulator + scope URL; SSO Tahap 4 |
| 4 | **Tooling strategy** | Grafana/Metabase embed vs custom hybrid? | ADR |
| 5 | **AI guardrail** | Model apa, data apa boleh dikirim, retensi prompt? | AI security design |
| 6 | **Alerting** | Kondisi & channel notifikasi (NPL spike, data stale)? | Alert catalog |
| 7 | **Compliance** | OJK/internal policy untuk export, retensi, masking? | Compliance checklist |

### Checklist Riset

- [ ] Bandingkan Grafana, Metabase, custom hybrid (cost, security, embedding)
- [ ] Uji Google Sheets: ukuran file, refresh, error handling, perubahan header
- [ ] Validasi formula banking dengan Risk & Finance
- [ ] Usability test: 1 direksi/manager cabang, 1 credit analyst, 1 user nonteknis
- [ ] Uji Ask AI dengan prompt nyata; ukur accuracy & ambiguity rate
- [ ] Tentukan data contract IoT/ATM jika ada: device ID, timestamp, status, event type

---

## Lampiran A — Glosarium

| Istilah | Definisi |
|---------|----------|
| **Data Source** | Sumber data: database, Google Sheets, file, API, perangkat |
| **Dataset** | Data terpilih/diolah siap dianalisis |
| **Dimension** | Field pengelompokan: Cabang, Produk, Region, Periode |
| **Measure** | Field numerik: Plafond, Outstanding, DPD |
| **Calculated Field** | Field baru dari formula per baris |
| **Metric** | Perhitungan bisnis reusable, mis. Rasio NPL |
| **Certified Metric** | Metric resmi yang disetujui Metric Owner |
| **Semantic Layer** | Lapisan arti bisnis: nama field, metric, relasi |
| **DPD** | Days Past Due — hari keterlambatan pembayaran |
| **NPL** | Non-Performing Loan — kredit bermasalah (definisi sesuai kebijakan bank) |
| **Drill-down / Drill-through** | Dari ringkasan ke detail agregasi / record |
| **Data Freshness** | Seberapa baru data terakhir ter-update |
| **Row/Column Security** | Batasan baris/kolom per user/group |
| **Role Simulator** | Pemilih peran di UI tanpa login; mengontrol masking, SQL, audit |
| **PoC** | Proof of Concept — uji kelayakan terbatas |

---

## Lampiran B — Referensi Teknis

- [Grafana Documentation](https://grafana.com/docs/) — Dashboards, Data sources, Transformations, Alerting
- [Metabase Documentation](https://www.metabase.com/docs/) — Query Builder, Metrics, Row/Column Security, Embedding
- Dokumentasi internal: SheetVision, dummy dataset portofolio kredit, kebutuhan AI analytics

---

## Penutup

Dokumen ini menjadi **baseline BRD v1.2** dengan konteks perbankan, kebijakan **tanpa login** untuk PoC/pilot, dan dataset dummy portofolio kredit.

**Langkah berikutnya (Tahap 2 — sisa Foundation):**

1. ~~Data policy server-side~~ ✅ · ~~Audit persisten~~ ✅ · ~~Metric glossary~~ ✅ · ~~Auto-refresh~~ ✅
2. ~~Lineage kolom~~ ✅ · ~~Data quality rules~~ ✅ · ~~Certified-metric AI mode~~ ✅ · ~~Export terjadwal~~ ✅
3. **Staging/read replica** konektor (ganti mock DB)
4. **Transform terjadwal** sync sheet → staging
5. Workshop Risk/Finance untuk formula certified (paralel bisnis)
6. SSO — **hanya Tahap 4 Enterprise**
