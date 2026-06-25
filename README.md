# SheetVision

Workspace BI untuk mengubah **Google Sheet** atau **database SQL** (PostgreSQL / MySQL) menjadi dashboard interaktif — dengan widget builder visual, filter tanpa SQL, dan chat AI opsional.

## Fitur utama

- **Project workspace** — setiap project punya sumber data (sheet atau DB) dan layout dashboard sendiri
- **Overview & widget builder** — pilih bentuk (angka, batang, donat, ranking, dll.) lalu atur data lewat UI
- **Multi-view** — Overview, Grafik, Data, Cari Data, Sumber
- **Google Sheet publik** + **PostgreSQL** & **MySQL** eksternal
- **Filter, drill-down, visual query** — tanpa menulis kode
- **AI Chat** (opsional) — analisis data & aksi dashboard
- **Auth** — login, role viewer / analyst / admin

## Prasyarat

- Node.js 20+
- PostgreSQL untuk database aplikasi (bisa via Docker Compose yang sudah ada di repo)
- Google Sheet harus **"Anyone with the link can view"** jika memakai sheet publik

## Setup lokal

### 1. Environment

Salin `.env.example` ke `.env` dan isi nilainya:

```bash
cp .env.example .env
```

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Ya | Database aplikasi (Prisma) |
| `APP_SECRET` | Ya | Min. 16 karakter — enkripsi password DB & session |
| `OPENAI_API_KEY` | Opsional | Fitur AI Chat |
| `OPENAI_MODEL` | Opsional | Default `gpt-4o-mini` |

### 2. Database

```bash
# Jalankan Postgres (lihat docker-compose.yml di repo)
docker compose up -d

# Migrasi + seed akun
npm run db:setup
```

Akun seed:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `superadmin` | `admin123` | admin |

### 3. Jalankan aplikasi

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Alur penggunaan

1. Login → buat atau pilih **project** (dropdown kiri atas)
2. Hubungkan **Google Sheet** atau **tabel database** di wizard / pengaturan project
3. Klik **Cek koneksi & muat data**
4. Atur **Overview** dengan widget builder (bentuk → data → simpan)
5. Gunakan tab Grafik, Data, atau Cari Data untuk eksplorasi lebih lanjut

## Database analisis IoT (sumber data eksternal)

Database terpisah dari database aplikasi — untuk dihubungkan lewat **Project → PostgreSQL** di SheetVision.

```bash
# Tambahkan ANALYTICS_* di .env (lihat .env.example), lalu:
docker compose up -d analytics-db
npm run analytics:setup
```

| Tabel | Isi |
|-------|-----|
| `devices` | Master perangkat IoT (10 sensor contoh) |
| `sensor_readings` | Pembacaan per jam (14 hari terakhir) |
| `device_daily_summary` | Agregat harian per metrik |
| `device_alerts` | Alert contoh |

**Koneksi di SheetVision** (`npm run dev` di laptop):

| Field | Nilai |
|-------|-------|
| Host | `localhost` |
| Port | `54328` |
| Database | `iot_analytics` |
| User | `iot_reader` (read-only) |
| Password | `iot_reader` (atau `ANALYTICS_DB_READER_PASSWORD`) |

Refresh data sample: `npm run analytics:seed`

## Database retail MySQL (sumber data eksternal)

Database terpisah untuk menguji koneksi **MySQL** di SheetVision.

```bash
# Tambahkan MYSQL_ANALYTICS_* di .env (lihat .env.example), lalu:
docker compose up -d mysql-analytics-db
npm run mysql:setup
```

| Tabel | Isi |
|-------|-----|
| `products` | Katalog produk retail (15 item contoh) |
| `orders` | Pesanan ~30 hari terakhir |
| `order_items` | Detail baris per pesanan |
| `daily_sales_summary` | Agregat harian per wilayah |

**Koneksi di SheetVision** (`npm run dev` di laptop):

| Field | Nilai |
|-------|-------|
| Tipe | MySQL |
| Host | `localhost` |
| Port | `33068` |
| Database | `retail_analytics` |
| User | `retail_reader` (read-only) |
| Password | `retail_reader` (atau `MYSQL_ANALYTICS_DB_READER_PASSWORD`) |

Refresh data sample: `npm run mysql:seed`

## Perintah berguna

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:setup     # Migrasi + seed
npm run analytics:setup   # DB IoT PostgreSQL + data contoh
npm run analytics:seed    # Isi ulang data IoT
npm run mysql:setup       # DB retail MySQL + data contoh
npm run mysql:seed        # Isi ulang data retail MySQL
npm run db:reset-workspace  # Reset data workspace (via API / menu user)
```

## Deploy

Deploy ke platform yang mendukung Next.js (mis. Vercel). **Wajib** set environment variables yang sama seperti `.env` — terutama `DB_*` dan `APP_SECRET`. Tanpa database aplikasi, login dan penyimpanan project tidak berfungsi.

## Tech stack

- Next.js 16 + React + TypeScript
- Tailwind CSS · Recharts
- Prisma + PostgreSQL
- Papa Parse (CSV sheet) · OpenAI API (opsional)
