-- Schema dummy analitik — selaras dengan mock DB di aplikasi

CREATE TABLE IF NOT EXISTS portofolio_kredit (
  no_fasilitas       TEXT PRIMARY KEY,
  nama_nasabah       TEXT NOT NULL,
  kantor_cabang      TEXT,
  region             TEXT,
  produk             TEXT,
  plafond            BIGINT,
  outstanding        BIGINT,
  dpd_hari           INTEGER,
  kolektibilitas     TEXT,
  status             TEXT,
  periode_laporan    TEXT
);

CREATE TABLE IF NOT EXISTS pengajuan_kredit (
  no_pengajuan              TEXT PRIMARY KEY,
  nama_nasabah              TEXT NOT NULL,
  kantor_cabang             TEXT,
  produk                    TEXT,
  plafond_diajukan          BIGINT,
  status_pengajuan          TEXT,
  no_fasilitas_referensi    TEXT,
  periode_laporan           TEXT
);

CREATE INDEX IF NOT EXISTS idx_portofolio_region ON portofolio_kredit (region);
CREATE INDEX IF NOT EXISTS idx_portofolio_status ON portofolio_kredit (status);
CREATE INDEX IF NOT EXISTS idx_pengajuan_status ON pengajuan_kredit (status_pengajuan);
