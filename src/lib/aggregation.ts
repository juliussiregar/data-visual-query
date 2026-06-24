import { parseNumber } from "./format";
import type { ChartDataPoint } from "./types";

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
  aktif: "#10b981",
  lunas: "#6366f1",
  "write-off": "#ef4444",
};

function colorForLabel(label: string, index: number): string {
  const key = label.toLowerCase();
  for (const [k, color] of Object.entries(STATUS_COLORS)) {
    if (key.includes(k)) return color;
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function aggregateData(
  rows: Record<string, string>[],
  categoryKey: string,
  valueKey: string | undefined,
  aggregation: "count" | "sum" | "avg" | "min" | "max"
): ChartDataPoint[] {
  const map = new Map<string, { sum: number; count: number; min: number; max: number }>();

  for (const row of rows) {
    const category = row[categoryKey]?.trim() || "Tidak ada";
    const existing = map.get(category) ?? { sum: 0, count: 0, min: Infinity, max: -Infinity };

    if (aggregation === "count") {
      existing.count += 1;
    } else if (valueKey) {
      const num = parseNumber(row[valueKey]);
      if (num !== null) {
        existing.sum += num;
        existing.count += 1;
        existing.min = Math.min(existing.min, num);
        existing.max = Math.max(existing.max, num);
      }
    }
    map.set(category, existing);
  }

  const points: ChartDataPoint[] = [];
  let i = 0;
  for (const [name, { sum, count, min, max }] of map.entries()) {
    let value = count;
    if (aggregation === "sum") value = sum;
    if (aggregation === "avg") value = count > 0 ? sum / count : 0;
    if (aggregation === "min") value = count > 0 ? min : 0;
    if (aggregation === "max") value = count > 0 ? max : 0;
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
