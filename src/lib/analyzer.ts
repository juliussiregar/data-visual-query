import { formatCurrency, formatNumber, parseNumber } from "./format";
import type {
  ChartConfig,
  ChartDataPoint,
  ChartType,
  ColumnMeta,
  ColumnType,
  DistributionItem,
  InsightItem,
  KpiMetric,
  SheetData,
  TopRecord,
} from "./types";

export const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

const STATUS_COLORS: Record<string, string> = {
  akad: "#10b981",
  sp3k: "#6366f1",
  "on progress": "#f59e0b",
  "belum lengkap": "#f97316",
  "berkas cancel": "#ef4444",
  cancel: "#ef4444",
  ya: "#10b981",
  tidak: "#64748b",
};

function colorForLabel(label: string, index: number): string {
  const key = label.toLowerCase();
  for (const [k, color] of Object.entries(STATUS_COLORS)) {
    if (key.includes(k)) return color;
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}

function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== "");
  if (nonEmpty.length === 0) return "text";

  const numericCount = nonEmpty.filter((v) => parseNumber(v) !== null).length;
  if (numericCount / nonEmpty.length >= 0.8) return "number";

  const dateCount = nonEmpty.filter((v) =>
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)
  ).length;
  if (dateCount / nonEmpty.length >= 0.6) return "date";

  const unique = new Set(nonEmpty.map((v) => v.toLowerCase())).size;
  if (unique <= Math.max(20, nonEmpty.length * 0.5)) return "category";

  return "text";
}

function analyzeColumns(rows: Record<string, string>[]): ColumnMeta[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const allValues = rows.map((r) => r[key] ?? "");
    const values = allValues.filter(Boolean);
    const unique = new Set(values.map((v) => v.toLowerCase()));
    return {
      key,
      label: key,
      type: detectColumnType(values),
      uniqueCount: unique.size,
      sampleValues: [...new Set(values)].slice(0, 5),
      fillRate: Math.round((values.length / rows.length) * 100),
    };
  });
}

export function aggregateData(
  rows: Record<string, string>[],
  categoryKey: string,
  valueKey: string | undefined,
  aggregation: "count" | "sum" | "avg"
): ChartDataPoint[] {
  const map = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    const category = row[categoryKey]?.trim() || "Tidak ada";
    const existing = map.get(category) ?? { sum: 0, count: 0 };

    if (aggregation === "count") {
      existing.count += 1;
    } else if (valueKey) {
      const num = parseNumber(row[valueKey]);
      if (num !== null) {
        existing.sum += num;
        existing.count += 1;
      }
    }
    map.set(category, existing);
  }

  const points: ChartDataPoint[] = [];
  let i = 0;
  for (const [name, { sum, count }] of map.entries()) {
    let value = count;
    if (aggregation === "sum") value = sum;
    if (aggregation === "avg") value = count > 0 ? sum / count : 0;
    points.push({
      name,
      value,
      fill: colorForLabel(name, i),
    });
    i += 1;
  }

  const sorted = points.sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, p) => s + p.value, 0);
  return sorted.map((p) => ({
    ...p,
    percentage: total > 0 ? (p.value / total) * 100 : 0,
  }));
}

function pickChartType(uniqueCount: number, index: number): ChartType {
  const types: ChartType[] = [
    "donut",
    "pie",
    "bar",
    "horizontalBar",
    "stackedBar",
    "area",
    "radial",
    "treemap",
    "radar",
    "composed",
    "line",
    "scatter",
  ];
  if (uniqueCount <= 5) return types[index % 3];
  if (uniqueCount <= 10) return types[(index + 2) % types.length];
  return index % 2 === 0 ? "horizontalBar" : "bar";
}

function getMainNumeric(columns: ColumnMeta[]): ColumnMeta | undefined {
  const numericCols = columns.filter((c) => c.type === "number");
  return (
    numericCols.find((c) =>
      /plafond|jumlah|total|amount|nilai|harga|revenue|sales/i.test(c.key)
    ) ?? numericCols[0]
  );
}

function getNameColumn(columns: ColumnMeta[]): ColumnMeta | undefined {
  return (
    columns.find((c) => /nama|name|debitur|customer|title|judul/i.test(c.key)) ??
    columns.find((c) => c.type === "text" && c.key !== "NO")
  );
}

function generateCharts(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const categoryCols = columns.filter(
    (c) => c.type === "category" && c.uniqueCount >= 2 && c.uniqueCount <= 15
  );
  const mainNumeric = getMainNumeric(columns);

  categoryCols.forEach((col, index) => {
    const type = pickChartType(col.uniqueCount, index);
    const data = aggregateData(rows, col.key, undefined, "count");
    if (data.length < 2) return;

    const isStatus = /status/i.test(col.key);
    charts.push({
      id: `count-${col.key}`,
      title: `Distribusi ${col.label}`,
      type,
      categoryKey: col.key,
      aggregation: "count",
      data: data.slice(0, 12),
      description: `Jumlah baris per kategori ${col.label}`,
      featured: isStatus,
    });
  });

  if (mainNumeric) {
    categoryCols.slice(0, 4).forEach((col, index) => {
      const data = aggregateData(rows, col.key, mainNumeric.key, "sum");
      if (data.length < 2 || data.every((d) => d.value === 0)) return;

      charts.push({
        id: `sum-${col.key}-${mainNumeric.key}`,
        title: `Total ${mainNumeric.label} per ${col.label}`,
        type: index % 3 === 0 ? "bar" : index % 3 === 1 ? "area" : "horizontalBar",
        categoryKey: col.key,
        valueKey: mainNumeric.key,
        aggregation: "sum",
        data: data.slice(0, 12),
        description: `Agregasi ${mainNumeric.label} berdasarkan ${col.label}`,
        featured: /status/i.test(col.key),
      });
    });

    categoryCols.slice(0, 2).forEach((col, index) => {
      const data = aggregateData(rows, col.key, mainNumeric.key, "avg");
      if (data.length < 2) return;
      charts.push({
        id: `avg-${col.key}-${mainNumeric.key}`,
        title: `Rata-rata ${mainNumeric.label} per ${col.label}`,
        type: index % 2 === 0 ? "line" : "bar",
        categoryKey: col.key,
        valueKey: mainNumeric.key,
        aggregation: "avg",
        data: data.slice(0, 10),
        description: `Nilai rata-rata ${mainNumeric.label} tiap ${col.label}`,
      });
    });
  }

  return charts.slice(0, 12);
}

function generateKpis(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): KpiMetric[] {
  const kpis: KpiMetric[] = [
    {
      id: "total-rows",
      label: "Total Data",
      value: formatNumber(rows.length),
      sublabel: "baris aktif",
      icon: "hash",
    },
  ];

  const mainNumeric = getMainNumeric(columns);
  if (mainNumeric) {
    const values = rows
      .map((r) => parseNumber(r[mainNumeric.key]))
      .filter((v): v is number => v !== null);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? total / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    kpis.push({
      id: "total-sum",
      label: `Total ${mainNumeric.label}`,
      value: formatCurrency(total),
      sublabel: "agregasi semua baris",
      icon: "wallet",
      trend: "up",
    });
    kpis.push({
      id: "avg",
      label: `Rata-rata ${mainNumeric.label}`,
      value: formatCurrency(avg),
      sublabel: `dari ${values.length} entri`,
      icon: "trending",
    });
    kpis.push({
      id: "max",
      label: `Tertinggi ${mainNumeric.label}`,
      value: formatCurrency(max),
      sublabel: "nilai maksimum",
      icon: "activity",
      trend: "neutral",
    });
  }

  const statusCol = columns.find((c) => /status/i.test(c.key));
  if (statusCol) {
    const counts = aggregateData(rows, statusCol.key, undefined, "count");
    const top = counts[0];
    const akad = counts.find((c) => c.name.toLowerCase().includes("akad"));
    if (top) {
      kpis.push({
        id: "top-status",
        label: "Status Terbanyak",
        value: top.name,
        sublabel: `${formatNumber(top.value)} berkas (${top.percentage?.toFixed(0)}%)`,
        icon: "chart",
      });
    }
    if (akad && rows.length > 0) {
      kpis.push({
        id: "akad-rate",
        label: "Tingkat Akad",
        value: `${akad.percentage?.toFixed(1)}%`,
        sublabel: `${formatNumber(akad.value)} berkas selesai`,
        icon: "users",
        trend: "up",
      });
    }
  }

  return kpis.slice(0, 6);
}

function generateDistributions(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): DistributionItem[] {
  const statusCol = columns.find((c) => /status/i.test(c.key));
  if (!statusCol) {
    const firstCat = columns.find((c) => c.type === "category");
    if (!firstCat) return [];
    return aggregateData(rows, firstCat.key, undefined, "count")
      .slice(0, 8)
      .map((d) => ({
        label: d.name,
        value: d.value,
        percentage: d.percentage ?? 0,
        color: d.fill ?? CHART_COLORS[0],
      }));
  }

  return aggregateData(rows, statusCol.key, undefined, "count")
    .slice(0, 8)
    .map((d) => ({
      label: d.name,
      value: d.value,
      percentage: d.percentage ?? 0,
      color: d.fill ?? CHART_COLORS[0],
    }));
}

function generateInsights(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): InsightItem[] {
  const insights: InsightItem[] = [];
  const mainNumeric = getMainNumeric(columns);
  const statusCol = columns.find((c) => /status/i.test(c.key));
  const categoryCols = columns.filter((c) => c.type === "category");

  insights.push({
    id: "rows",
    title: `${rows.length} entri data`,
    description: `Dataset memiliki ${columns.length} kolom dengan ${categoryCols.length} kolom kategorikal.`,
    type: "info",
    metric: String(rows.length),
  });

  if (mainNumeric) {
    const values = rows
      .map((r) => parseNumber(r[mainNumeric.key]))
      .filter((v): v is number => v !== null);
    const total = values.reduce((a, b) => a + b, 0);
    insights.push({
      id: "total-value",
      title: `Total ${mainNumeric.label}: ${formatCurrency(total)}`,
      description: `Nilai terkonsentrasi pada ${values.length} baris valid. Rata-rata ${formatCurrency(total / (values.length || 1))} per entri.`,
      type: "highlight",
      metric: formatCurrency(total),
    });
  }

  if (statusCol) {
    const dist = aggregateData(rows, statusCol.key, undefined, "count");
    const cancel = dist.filter(
      (d) =>
        d.name.toLowerCase().includes("cancel") ||
        d.name.toLowerCase().includes("batal")
    );
    const cancelTotal = cancel.reduce((s, c) => s + c.value, 0);
    const cancelPct = rows.length > 0 ? (cancelTotal / rows.length) * 100 : 0;

    if (cancelTotal > 0) {
      insights.push({
        id: "cancel",
        title: `${cancelPct.toFixed(0)}% berkas cancel/batal`,
        description: `${formatNumber(cancelTotal)} dari ${rows.length} berkas tidak lanjut. Perlu perhatian pada pipeline.`,
        type: "warning",
        metric: `${cancelPct.toFixed(0)}%`,
      });
    }

    const onProgress = dist.find((d) => d.name.toLowerCase().includes("progress"));
    if (onProgress) {
      insights.push({
        id: "progress",
        title: `${onProgress.value} berkas masih On Progress`,
        description: `Menunggu tindak lanjut — ${onProgress.percentage?.toFixed(0)}% dari total pipeline.`,
        type: "info",
        metric: String(onProgress.value),
      });
    }
  }

  const lowFillCols = columns.filter((c) => c.fillRate < 50 && c.type !== "number");
  if (lowFillCols.length > 0) {
    insights.push({
      id: "missing",
      title: `${lowFillCols.length} kolom data kurang lengkap`,
      description: `Kolom seperti ${lowFillCols.slice(0, 2).map((c) => c.label).join(", ")} memiliki fill rate di bawah 50%.`,
      type: "warning",
    });
  }

  const prioritasCol = columns.find((c) => /prioritas|priority/i.test(c.key));
  if (prioritasCol) {
    const ya = rows.filter((r) => r[prioritasCol.key]?.toUpperCase() === "YA").length;
    const pct = rows.length > 0 ? (ya / rows.length) * 100 : 0;
    insights.push({
      id: "prioritas",
      title: `${pct.toFixed(0)}% nasabah prioritas`,
      description: `${formatNumber(ya)} dari ${rows.length} debitur termasuk nasabah prioritas (YA).`,
      type: "success",
      metric: `${pct.toFixed(0)}%`,
    });
  }

  return insights.slice(0, 6);
}

function generateTopRecords(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): TopRecord[] {
  const mainNumeric = getMainNumeric(columns);
  const nameCol = getNameColumn(columns);
  const statusCol = columns.find((c) => /status/i.test(c.key));
  if (!mainNumeric) return [];

  const records = rows
    .map((row) => {
      const value = parseNumber(row[mainNumeric.key]);
      if (value === null) return null;
      return {
        label: nameCol ? row[nameCol.key] || "—" : `Baris ${row["NO"] || "?"}`,
        sublabel: statusCol ? row[statusCol.key] : undefined,
        value,
        badge: statusCol ? row[statusCol.key] : undefined,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return records.map((r, i) => ({
    rank: i + 1,
    label: r.label,
    sublabel: r.sublabel,
    value: r.value,
    valueFormatted: formatCurrency(r.value),
    badge: r.badge,
  }));
}

export function analyzeSheetData(
  rows: Record<string, string>[],
  sourceUrl: string,
  fetchedAt?: string
): SheetData {
  const columns = analyzeColumns(rows);
  const charts = generateCharts(rows, columns);
  const kpis = generateKpis(rows, columns);
  const insights = generateInsights(rows, columns);
  const distributions = generateDistributions(rows, columns);
  const topRecords = generateTopRecords(rows, columns);

  return {
    rows,
    columns,
    charts,
    kpis,
    insights,
    distributions,
    topRecords,
    sourceUrl,
    fetchedAt: fetchedAt ?? new Date().toISOString(),
  };
}

export function buildDataSummary(data: SheetData): string {
  const columnSummary = data.columns
    .map(
      (c) =>
        `- ${c.label} (${c.type}, ${c.uniqueCount} unik, fill ${c.fillRate}%, contoh: ${c.sampleValues.join(", ")})`
    )
    .join("\n");

  const sampleRows = data.rows.slice(0, 15);
  const sampleJson = JSON.stringify(sampleRows, null, 2);

  return `Kolom:\n${columnSummary}\n\nJumlah baris: ${data.rows.length}\nKPI: ${data.kpis.map((k) => `${k.label}: ${k.value}`).join(", ")}\nInsights: ${data.insights.map((i) => i.title).join("; ")}\n\nSample data (15 baris pertama):\n${sampleJson}`;
}
