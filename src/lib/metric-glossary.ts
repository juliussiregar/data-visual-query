export type GlossaryCategory = "generic" | "banking" | "quality";

export interface GlossaryEntry {
  id: string;
  name: string;
  formula: string;
  unit: string;
  category: GlossaryCategory;
  description: string;
  owner?: string;
  status: "draft" | "certified" | "deprecated";
}

export const METRIC_GLOSSARY: GlossaryEntry[] = [
  {
    id: "row_count",
    name: "Jumlah Baris",
    formula: "COUNT(*)",
    unit: "count",
    category: "generic",
    description: "Total baris pada dataset aktif setelah scope dan filter.",
    status: "certified",
  },
  {
    id: "sum_measure",
    name: "Total Measure",
    formula: "SUM(kolom_numerik)",
    unit: "auto",
    category: "generic",
    description: "Agregasi SUM dari kolom numerik terdeteksi otomatis.",
    status: "certified",
  },
  {
    id: "period_delta",
    name: "Delta Periode",
    formula: "(SUM measure periode N − SUM periode N−1) / SUM periode N−1",
    unit: "%",
    category: "generic",
    description: "Perubahan persentase antar dua periode berurutan pada kolom periode.",
    status: "certified",
  },
  {
    id: "null_rate",
    name: "Tingkat Sel Kosong",
    formula: "sel_kosong / total_sel × 100",
    unit: "%",
    category: "quality",
    description: "Proporsi sel kosong — indikator kualitas sumber data.",
    owner: "Data Admin",
    status: "certified",
  },
  {
    id: "conversion_rate",
    name: "Conversion Rate (Join)",
    formula: "disetujui / total_pengajuan × 100",
    unit: "%",
    category: "banking",
    description: "Rasio pengajuan disetujui/disbursed terhadap total pipeline — contoh multi-sheet join.",
    owner: "Metric Owner",
    status: "draft",
  },
  {
    id: "outstanding_sum",
    name: "Total Outstanding",
    formula: "SUM(Outstanding)",
    unit: "IDR",
    category: "banking",
    description: "Total saldo outstanding fasilitas aktif — definisi resmi perlu disetujui Risk/Finance.",
    owner: "Metric Owner",
    status: "draft",
  },
];

export function getGlossaryByCategory(category?: GlossaryCategory): GlossaryEntry[] {
  if (!category) return METRIC_GLOSSARY;
  return METRIC_GLOSSARY.filter((e) => e.category === category);
}
