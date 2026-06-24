INSERT INTO portofolio_kredit (
  no_fasilitas, nama_nasabah, kantor_cabang, region, produk,
  plafond, outstanding, dpd_hari, kolektibilitas, status, periode_laporan
) VALUES
  ('F-2026-00001', 'PT Surya Maju', 'Cabang Jakarta Pusat', 'Jabotabek', 'KMK', 500000000, 320000000, 0, '1', 'Aktif', '2026-Q1'),
  ('F-2026-00002', 'CV Mitra Sejahtera', 'Cabang Bandung', 'Jawa Barat', 'KPR', 800000000, 650000000, 45, '2', 'Aktif', '2026-Q1'),
  ('F-2026-00003', 'UD Berkah Jaya', 'Cabang Surabaya', 'Jawa Timur', 'KTA', 50000000, 12000000, 90, '3', 'Aktif', '2026-Q1'),
  ('F-2026-00004', 'PT Nusa Kimia', 'Cabang Bogor', 'Jawa Barat', 'KBG', 1000000000, 0, 0, '1', 'Lunas', '2026-Q2'),
  ('F-2026-00005', 'PT Global Tek', 'Cabang Jakarta Selatan', 'Jabotabek', 'KMK', 250000000, 180000000, 120, '4', 'Aktif', '2026-Q2')
ON CONFLICT (no_fasilitas) DO NOTHING;

INSERT INTO pengajuan_kredit (
  no_pengajuan, nama_nasabah, kantor_cabang, produk,
  plafond_diajukan, status_pengajuan, no_fasilitas_referensi, periode_laporan
) VALUES
  ('P-2026-00001', 'PT Surya Maju', 'Cabang Jakarta Pusat', 'KMK', 500000000, 'Disbursement', 'F-2026-00001', '2026-Q1'),
  ('P-2026-00002', 'CV Baru Digital', 'Cabang Bandung', 'KPR', 400000000, 'Rejected', '', '2026-Q1'),
  ('P-2026-00003', 'PT Nusa Kimia', 'Cabang Bogor', 'KBG', 1000000000, 'Approved', 'F-2026-00004', '2026-Q2'),
  ('P-2026-00004', 'PT Global Tek', 'Cabang Jakarta Selatan', 'KMK', 250000000, 'Disbursement', 'F-2026-00005', '2026-Q2')
ON CONFLICT (no_pengajuan) DO NOTHING;
