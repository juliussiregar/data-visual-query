# SheetVision

Workspace BI untuk mengubah **Google Sheet** atau **database SQL** (PostgreSQL / MySQL / MariaDB) menjadi dashboard interaktif — dengan widget builder visual, filter tanpa SQL, dan chat AI opsional.

## Fitur utama

- **Project workspace** — setiap project punya sumber data (sheet atau DB) dan layout dashboard sendiri
- **Overview & widget builder** — pilih bentuk (angka, batang, donat, ranking, dll.) lalu atur data lewat UI
- **Multi-view** — Overview, Grafik, Data, Cari Data, Sumber
- **Google Sheet publik** + **PostgreSQL** & **MySQL** eksternal
- **Filter, drill-down, visual query** — tanpa menulis kode
- **Kolom custom** — user buat kolom baru dari gabungan kolom yang ada (mis. `tugas + fisika + biologi`), hanya di aplikasi
- **Query editor SQL-like** — `SELECT metric, AVG(avg_value) FROM * GROUP BY metric` → grafik
- **AI Chat** (opsional) — analisis data, query SQL-like (`run_visual_sql`), & aksi dashboard
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
| `device_health_scores` | Skor komponen per perangkat/hari (latihan formula BI) |
| `device_alerts` | Alert contoh |

Refresh data sample (lokal, butuh Node.js):

```bash
npm run analytics:seed
```

**Koneksi di SheetVision — deploy server** (app & DB di Docker Compose yang sama):

| Field | Nilai |
|-------|-------|
| Host | `analytics-db` |
| Port | `5432` |
| Database | `iot_analytics` |
| User | `iot_reader` |
| Password | dari `.env` → `ANALYTICS_DB_READER_PASSWORD` |

> Port `54328` hanya untuk akses dari **host/laptop** (`localhost`), bukan dari form koneksi di container `app`.

**Koneksi di SheetVision — dev lokal** (`npm run dev` di laptop):

| Field | Nilai |
|-------|-------|
| Host | `localhost` |
| Port | `54328` |
| Database | `iot_analytics` |
| User | `iot_reader` |
| Password | `iot_reader` (atau `ANALYTICS_DB_READER_PASSWORD`) |

**Kolom custom** — gabungkan kolom yang sudah ada tanpa mengubah database sumber:

1. Project → tabel **`device_health_scores`** (schema `public`)
2. Pengaturan → **Kolom baru (custom)** → misalnya nama `Beban total`, rumus `baseline_load + peak_load + steady_load`
3. Simpan project → Explore: `SELECT zone, AVG(beban_total) FROM * GROUP BY zone`

### Demo pendidikan (schema terpisah, database sama)

IoT dan pendidikan berada di **satu container** `analytics-db`, database `iot_analytics`:

| Schema | Tabel | Isi |
|--------|-------|-----|
| `public` | `devices`, `sensor_readings`, … | Data IoT |
| `education` | `students`, `student_grades` | Nilai siswa demo |

```bash
npm run education:seed
# Server:
docker compose exec app sh -c 'ANALYTICS_DB_HOST=analytics-db ANALYTICS_DB_PORT=5432 node scripts/seed-education-analytics.mjs'
docker compose exec app sh -c 'ANALYTICS_DB_HOST=analytics-db ANALYTICS_DB_PORT=5432 node scripts/setup-analytics-reader.mjs'
```

**Koneksi SheetVision — project pendidikan** (beda project dari IoT):

| Field | Nilai |
|-------|-------|
| Host | `analytics-db` (server) / `localhost` (dev) |
| Port | `5432` / `54328` |
| Database | `iot_analytics` |
| **Schema** | **`education`** |
| User | `iot_reader` |

Tabel: **`student_grades`** — kolom `tugas`, `ulangan`, `ujian`, `fisika`, `biologi`, `region`, `jurusan`.

1. Pengaturan → **Kolom baru (custom)** → misalnya nama `IPA`, rumus `tugas + fisika + biologi`
2. Simpan project → Explore: `SELECT region, AVG(ipa) FROM * GROUP BY region`

Arsitektur IoT produksi: [docs/IOT_INGESTION.md](docs/IOT_INGESTION.md)

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

Refresh data sample (lokal, butuh Node.js):

```bash
npm run mysql:seed
```

**Koneksi di SheetVision — deploy server** (app & DB di Docker Compose yang sama):

| Field | Nilai |
|-------|-------|
| Tipe | MySQL |
| Host | `mysql-analytics-db` |
| Port | `3306` |
| Database | `retail_analytics` |
| User | `retail_reader` |
| Password | dari `.env` → `MYSQL_ANALYTICS_DB_READER_PASSWORD` |

> Port `33068` hanya untuk akses dari **host/laptop** (`localhost`), bukan dari form koneksi di container `app`.

**Koneksi di SheetVision — dev lokal** (`npm run dev` di laptop):

| Field | Nilai |
|-------|-------|
| Tipe | MySQL |
| Host | `localhost` |
| Port | `33068` |
| Database | `retail_analytics` |
| User | `retail_reader` |
| Password | `retail_reader` (atau `MYSQL_ANALYTICS_DB_READER_PASSWORD`) |

## MariaDB

MariaDB memakai protokol yang sama dengan MySQL. Di **Sources** atau wizard project, pilih tipe **MariaDB** (bukan MySQL) agar label koneksi dan lineage jelas.

| Field | Nilai tipikal |
|-------|----------------|
| Tipe | **MariaDB** |
| Port | `3306` |
| Host / Database / User / Password | Sesuai server MariaDB Anda |

Driver internal tetap `mysql2` — load tabel, join, dan widget berperilaku sama seperti MySQL.

### MariaDB ERP (Frappe) — server produksi sama

SheetVision jalan di container; tes koneksi dari **server app**, bukan dari browser laptop.

| Lingkungan | Host | Port |
|------------|------|------|
| Dev (laptop + SSH tunnel) | `127.0.0.1` | `3307` |
| Prod (same server, Docker network) | **`mariadb`** | **`3306`** |

Service `app` di `docker-compose.yml` join network Frappe (`FRAPPE_DOCKER_NETWORK`, default `docker_default`). **Tidak perlu** publish MariaDB ke host.

Set di `.env` server:

```bash
FRAPPE_DOCKER_NETWORK=docker_default
```

Tes dari container:

```bash
docker exec -it sheetvision-app nc -zv mariadb 3306
```

**Sudah deploy sebelumnya?** Sebelum `git pull` + rebuild, cek prefix volume di server (`docker volume ls`). Set `COMPOSE_PROJECT_NAME` di `.env` sama dengan deploy pertama — lihat [docs/FRAPPE_ERP_ONBOARDING.md](docs/FRAPPE_ERP_ONBOARDING.md#g-deploy-yang-sudah-berjalan).

User database: akun **SELECT-only** (mis. `sheetvision_reader`) pada database site ERP (`_xxxxxxxx`).

Checklist lengkap untuk tim deploy (multi-server, multi-site): **[docs/FRAPPE_ERP_ONBOARDING.md](docs/FRAPPE_ERP_ONBOARDING.md)**.

## Perintah berguna

**Dev lokal** (butuh Node.js):

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:setup     # Migrasi + seed akun app
npm run analytics:setup   # DB IoT PostgreSQL + data contoh
npm run analytics:seed    # Isi ulang data IoT
npm run mysql:setup       # DB retail MySQL + data contoh
npm run mysql:seed        # Isi ulang data retail MySQL
npm run db:reset-workspace  # Reset data workspace (via API / menu user)
```

**Server tanpa Node.js** — seed lewat container: lihat [Deploy server (Docker Compose)](#deploy-server-docker-compose).

## Deploy server (Docker Compose)

Cocok untuk VPS tanpa Node.js di host. Semua service dijalankan lewat Docker.

### 1. Persiapan

```bash
cp .env.example .env
# Isi minimal: APP_SECRET, DB_PASSWORD, ANALYTICS_DB_PASSWORD, MYSQL_ANALYTICS_DB_PASSWORD
```

### 2. Build & jalankan

```bash
docker compose up -d --build
```

Service yang berjalan:

| Container | Port (host) | Fungsi |
|-----------|-------------|--------|
| `sheetvision-app` | `3066` (default) | Aplikasi web |
| `sheetvision-db` | `127.0.0.1:54327` | Database aplikasi (Prisma) |
| `sheetvision-analytics-db` | `127.0.0.1:54328` | PostgreSQL demo IoT |
| `sheetvision-mysql-analytics-db` | `127.0.0.1:33068` | MySQL demo retail |

### 3. Yang otomatis vs manual

| Langkah | Otomatis? | Keterangan |
|---------|-----------|------------|
| Migrasi schema app (`db`) | ✅ | Saat container `app` start (`RUN_DB_MIGRATE=true`) |
| Skema tabel IoT / MySQL + user reader | ✅ | Saat volume DB pertama kali dibuat |
| **Seed akun login** (`admin`, `superadmin`) | ❌ sekali | Lihat perintah di bawah |
| **Data sample IoT / MySQL** | ❌ opsional | Lihat perintah di bawah |

### 4. Seed akun login (wajib, sekali)

```bash
docker compose run --rm -e RUN_DB_SEED=true app true
```

Atau set `RUN_DB_SEED=true` di `.env`, lalu `docker compose restart app` sekali, lalu kembalikan ke `false`.

Akun: `admin` / `admin123`, `superadmin` / `admin123`

### 5. Seed data demo PostgreSQL (IoT) lewat container

Tidak perlu `npm` di server. Jalankan dari folder project (`~/data-visual-query`):

```bash
docker compose exec app sh -c \
  'ANALYTICS_DB_HOST=analytics-db ANALYTICS_DB_PORT=5432 node scripts/seed-analytics-iot.mjs'
```

Output yang diharapkan: jumlah baris di `devices`, `sensor_readings`, `device_alerts`, `device_daily_summary`.

Isi ulang data kapan saja dengan perintah yang sama.

### 5b. Seed data demo pendidikan (schema `education`, database sama)

```bash
docker compose exec app sh -c \
  'ANALYTICS_DB_HOST=analytics-db ANALYTICS_DB_PORT=5432 node scripts/seed-education-analytics.mjs'

# Grant reader ke schema education (sekali setelah pull, atau setelah DB lama tanpa schema ini):
docker compose exec app sh -c \
  'ANALYTICS_DB_HOST=analytics-db ANALYTICS_DB_PORT=5432 node scripts/setup-analytics-reader.mjs'
```

Di SheetVision: koneksi baru dengan **Schema = `education`**, tabel `student_grades`.

### 6. Seed data demo MySQL (retail) lewat container

```bash
docker compose exec app sh -c \
  'MYSQL_ANALYTICS_DB_HOST=mysql-analytics-db MYSQL_ANALYTICS_DB_PORT=3306 node scripts/seed-mysql-analytics.mjs'
```

> Butuh image `app` yang sudah include `mysql2` (ada di `Dockerfile`). Setelah `git pull`, jalankan `docker compose up -d --build` sekali.

**Alternatif tanpa rebuild** (one-off container Node, jika image lama belum punya `mysql2`):

```bash
docker run --rm \
  --network data-visual-query_sheetvision \
  -v "$(pwd):/app" -w /app \
  --env-file .env \
  -e MYSQL_ANALYTICS_DB_HOST=mysql-analytics-db \
  -e MYSQL_ANALYTICS_DB_PORT=3306 \
  node:20-alpine \
  sh -c "npm install mysql2 && node scripts/seed-mysql-analytics.mjs"
```

> Ganti `data-visual-query_sheetvision` jika nama network berbeda (`docker network ls | grep sheetvision`).

### 7. Koneksi DB di UI SheetVision (server)

Saat app dan database demo berjalan di **Docker Compose yang sama**, gunakan **nama service** sebagai host — bukan IP publik server:

| Database | Host | Port |
|----------|------|------|
| PostgreSQL IoT | `analytics-db` | `5432` |
| MySQL retail | `mysql-analytics-db` | `3306` |

Port `54328` / `33068` hanya untuk akses langsung dari mesin host (mis. DBeaver di laptop via SSH tunnel).

### 8. Cek cepat

```bash
docker compose ps
docker compose logs app --tail 30
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3066
```

---

## Deploy lain (Vercel / PaaS)

Deploy ke platform yang mendukung Next.js (mis. Vercel). **Wajib** set environment variables yang sama seperti `.env` — terutama `DB_*` dan `APP_SECRET`. Tanpa database aplikasi, login dan penyimpanan project tidak berfungsi.

## Tech stack

- Next.js 16 + React + TypeScript
- Tailwind CSS · Recharts
- Prisma + PostgreSQL
- Papa Parse (CSV sheet) · OpenAI API (opsional)
