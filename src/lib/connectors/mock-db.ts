export interface MockTable {
  name: string;
  label: string;
  description: string;
  columns: string[];
  rows: Record<string, string>[];
}

const PORTOFOLIO_ROWS: Record<string, string>[] = [
  { No_Fasilitas: "F-2026-00001", Nama_Nasabah: "PT Surya Maju", Kantor_Cabang: "Cabang Jakarta Pusat", Region: "Jabotabek", Produk: "KMK", Plafond: "500000000", Outstanding: "320000000", DPD_Hari: "0", Kolektibilitas: "1", Status: "Aktif", Periode_Laporan: "2026-Q1" },
  { No_Fasilitas: "F-2026-00002", Nama_Nasabah: "CV Mitra Sejahtera", Kantor_Cabang: "Cabang Bandung", Region: "Jawa Barat", Produk: "KPR", Plafond: "800000000", Outstanding: "650000000", DPD_Hari: "45", Kolektibilitas: "2", Status: "Aktif", Periode_Laporan: "2026-Q1" },
  { No_Fasilitas: "F-2026-00003", Nama_Nasabah: "UD Berkah Jaya", Kantor_Cabang: "Cabang Surabaya", Region: "Jawa Timur", Produk: "KTA", Plafond: "50000000", Outstanding: "12000000", DPD_Hari: "90", Kolektibilitas: "3", Status: "Aktif", Periode_Laporan: "2026-Q1" },
  { No_Fasilitas: "F-2026-00004", Nama_Nasabah: "PT Nusa Kimia", Kantor_Cabang: "Cabang Bogor", Region: "Jawa Barat", Produk: "KBG", Plafond: "1000000000", Outstanding: "0", DPD_Hari: "0", Kolektibilitas: "1", Status: "Lunas", Periode_Laporan: "2026-Q2" },
  { No_Fasilitas: "F-2026-00005", Nama_Nasabah: "PT Global Tek", Kantor_Cabang: "Cabang Jakarta Selatan", Region: "Jabotabek", Produk: "KMK", Plafond: "250000000", Outstanding: "180000000", DPD_Hari: "120", Kolektibilitas: "4", Status: "Aktif", Periode_Laporan: "2026-Q2" },
];

const PENGAJUAN_ROWS: Record<string, string>[] = [
  { No_Pengajuan: "P-2026-00001", Nama_Nasabah: "PT Surya Maju", Kantor_Cabang: "Cabang Jakarta Pusat", Produk: "KMK", Plafond_Diajukan: "500000000", Status_Pengajuan: "Disbursement", No_Fasilitas_Referensi: "F-2026-00001", Periode_Laporan: "2026-Q1" },
  { No_Pengajuan: "P-2026-00002", Nama_Nasabah: "CV Baru Digital", Kantor_Cabang: "Cabang Bandung", Produk: "KPR", Plafond_Diajukan: "400000000", Status_Pengajuan: "Rejected", No_Fasilitas_Referensi: "", Periode_Laporan: "2026-Q1" },
  { No_Pengajuan: "P-2026-00003", Nama_Nasabah: "PT Nusa Kimia", Kantor_Cabang: "Cabang Bogor", Produk: "KBG", Plafond_Diajukan: "1000000000", Status_Pengajuan: "Approved", No_Fasilitas_Referensi: "F-2026-00004", Periode_Laporan: "2026-Q2" },
  { No_Pengajuan: "P-2026-00004", Nama_Nasabah: "PT Global Tek", Kantor_Cabang: "Cabang Jakarta Selatan", Produk: "KMK", Plafond_Diajukan: "250000000", Status_Pengajuan: "Disbursement", No_Fasilitas_Referensi: "F-2026-00005", Periode_Laporan: "2026-Q2" },
];

const TABLES: MockTable[] = [
  {
    name: "portofolio_kredit",
    label: "Portofolio Kredit (Mock)",
    description: "Dataset dummy fasilitas aktif — PoC DB connector",
    columns: Object.keys(PORTOFOLIO_ROWS[0]),
    rows: PORTOFOLIO_ROWS,
  },
  {
    name: "pengajuan_kredit",
    label: "Pengajuan Kredit (Mock)",
    description: "Dataset dummy pipeline pengajuan — PoC DB connector",
    columns: Object.keys(PENGAJUAN_ROWS[0]),
    rows: PENGAJUAN_ROWS,
  },
];

export function listMockTables(): Omit<MockTable, "rows">[] {
  return TABLES.map(({ name, label, description, columns }) => ({
    name,
    label,
    description,
    columns,
  }));
}

export function getMockTable(name: string): MockTable | null {
  return TABLES.find((t) => t.name === name) ?? null;
}

export function getAllMockTables(): MockTable[] {
  return TABLES;
}
