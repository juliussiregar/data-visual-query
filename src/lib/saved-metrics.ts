import { parseNumber } from "./format";
import type { ColumnMeta, MetricDefinition, MetricValues } from "./types";
import type { SavedMetric } from "./metrics-storage";

export function evaluateSavedMetric(
  metric: MetricDefinition,
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): number | null {
  const formula = metric.formula.trim();

  if (formula === "COUNT(*)") return rows.length;

  const sumMatch = formula.match(/^SUM\(([^)]+)\)$/i);
  if (sumMatch) {
    const key = sumMatch[1].trim();
    let total = 0;
    let count = 0;
    for (const row of rows) {
      const n = parseNumber(row[key]);
      if (n !== null) {
        total += n;
        count++;
      }
    }
    return count > 0 ? total : null;
  }

  const avgMatch = formula.match(/^AVG\(([^)]+)\)$/i);
  if (avgMatch) {
    const key = avgMatch[1].trim();
    let total = 0;
    let count = 0;
    for (const row of rows) {
      const n = parseNumber(row[key]);
      if (n !== null) {
        total += n;
        count++;
      }
    }
    return count > 0 ? total / count : null;
  }

  const plusMatch = formula.match(/^(\w+)\s*\+\s*(\w+)$/);
  if (plusMatch) {
    const [, a, b] = plusMatch;
    let total = 0;
    let count = 0;
    for (const row of rows) {
      const va = parseNumber(row[a]);
      const vb = parseNumber(row[b]);
      if (va !== null && vb !== null) {
        total += va + vb;
        count++;
      }
    }
    return count > 0 ? total : null;
  }

  const ratioMatch = formula.match(/^(\w+)\s*\/\s*(\w+)$/);
  if (ratioMatch) {
    const [, numKey, denKey] = ratioMatch;
    let num = 0;
    let den = 0;
    for (const row of rows) {
      const n = parseNumber(row[numKey]);
      const d = parseNumber(row[denKey]);
      if (n !== null) num += n;
      if (d !== null) den += d;
    }
    return den > 0 ? (num / den) * 100 : null;
  }

  void columns;
  return null;
}

export function computeSavedMetricValues(
  metrics: SavedMetric[],
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): MetricValues {
  const dynamic: Record<string, number> = {};
  for (const m of metrics) {
    const v = evaluateSavedMetric(m, rows, columns);
    if (v !== null) dynamic[m.id] = v;
  }
  return { totalRows: rows.length, dynamic };
}

export function createCustomMetric(
  name: string,
  formula: string,
  unit: string,
  createdBy?: string
): SavedMetric {
  const id = `custom_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
  return {
    id,
    name,
    type: formula.includes("+") || formula.includes("/") ? "calculated_field" : "aggregate",
    formula,
    unit,
    status: "draft",
    description: "Metric kustom pengguna",
    createdAt: new Date().toISOString(),
    createdBy,
  };
}
