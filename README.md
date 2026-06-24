# SheetVision

Workspace BI untuk mengubah **Google Sheet** atau **PostgreSQL** menjadi dashboard interaktif — dengan widget builder visual, filter tanpa SQL, dan chat AI opsional.

## Fitur utama

- **Project workspace** — setiap project punya sumber data (sheet atau DB) dan layout dashboard sendiri
- **Overview & widget builder** — pilih bentuk (angka, batang, donat, ranking, dll.) lalu atur data lewat UI
- **Multi-view** — Overview, Grafik, Data, Cari Data, Sumber
- **Google Sheet publik** + **PostgreSQL** eksternal
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
2. Hubungkan **Google Sheet** atau **tabel PostgreSQL** di wizard / pengaturan project
3. Klik **Cek koneksi & muat data**
4. Atur **Overview** dengan widget builder (bentuk → data → simpan)
5. Gunakan tab Grafik, Data, atau Cari Data untuk eksplorasi lebih lanjut

## Perintah berguna

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:setup     # Migrasi + seed
npm run db:reset-workspace  # Reset data workspace (via API / menu user)
```

## Deploy

Deploy ke platform yang mendukung Next.js (mis. Vercel). **Wajib** set environment variables yang sama seperti `.env` — terutama `DB_*` dan `APP_SECRET`. Tanpa database aplikasi, login dan penyimpanan project tidak berfungsi.

## Tech stack

- Next.js 16 + React + TypeScript
- Tailwind CSS · Recharts
- Prisma + PostgreSQL
- Papa Parse (CSV sheet) · OpenAI API (opsional)
