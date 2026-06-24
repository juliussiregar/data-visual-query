import { parseNumber, formatNumber } from "./format";
import type { ColumnMeta, MetricDefinition, MetricValues } from "./types";

const NUMERIC_PRIORITY =
  /total|jumlah|amount|revenue|pendapatan|sales|nilai|harga|biaya|qty|quantity|count|sum|outstanding|plafond|saldo|budget|target/i;

export function pickNumericMeasureColumns(columns: ColumnMeta[], limit = 4): ColumnMeta[] {
  const numeric = columns.filter((c) => c.type === "number");
  const scored = numeric.map((col) => ({
    col,
    score: NUMERIC_PRIORITY.test(col.key) ? 2 : 1,
  }));
  scored.sort((a, b) => b.score - a.score || b.col.fillRate - a.col.fillRate);
  return scored.slice(0, limit).map((s) => s.col);
}

function aggregateColumn(
  rows: Record<string, string>[],
  key: string
): { sum: number; count: number; min: number; max: number; avg: number } {
  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const n = parseNumber(row[key]);
    if (n !== null) {
      sum += n;
      count += 1;
      min = Math.min(min, n);
      max = Math.max(max, n);
    }
  }
  return {
    sum,
    count,
    min: count > 0 ? min : 0,
    max: count > 0 ? max : 0,
    avg: count > 0 ? sum / count : 0,
  };
}

function labelFor(col: ColumnMeta): string {
  return col.businessLabel ?? col.label.replace(/_/g, " ");
}

export function buildGenericMetrics(
  columns: ColumnMeta[],
  rows: Record<string, string>[]
): { definitions: MetricDefinition[]; values: MetricValues } {
  const measures = pickNumericMeasureColumns(columns);
  const definitions: MetricDefinition[] = [];
  const dynamic: Record<string, number> = {};

  for (const col of measures) {
    const stats = aggregateColumn(rows, col.key);
    const baseLabel = labelFor(col);

    const sumId = `sum_${col.key}`;
    dynamic[sumId] = stats.sum;
    definitions.push({
      id: sumId,
      name: `Total ${baseLabel}`,
      type: "aggregate",
      formula: `SUM(${col.key})`,
      unit: "auto",
      status: "draft",
      description: `Agregasi dari kolom ${col.key} (${stats.count} baris valid)`,
    });

    if (stats.count > 0) {
      const avgId = `avg_${col.key}`;
      dynamic[avgId] = stats.avg;
      definitions.push({
        id: avgId,
        name: `Rata-rata ${baseLabel}`,
        type: "aggregate",
        formula: `AVG(${col.key})`,
        unit: "auto",
        status: "draft",
        description: `Nilai rata-rata kolom ${col.key}`,
      });
    }
  }

  const numericCols = columns.filter((c) => c.type === "number");
  if (numericCols.length >= 2) {
    const [a, b] = numericCols.slice(0, 2);
    const calcId = `calc_${a.key}_plus_${b.key}`;
    let valid = 0;
    let total = 0;
    for (const row of rows) {
      const va = parseNumber(row[a.key]);
      const vb = parseNumber(row[b.key]);
      if (va !== null && vb !== null) {
        total += va + vb;
        valid += 1;
      }
    }
    if (valid > 0) {
      dynamic[calcId] = total;
      definitions.push({
        id: calcId,
        name: `${labelFor(a)} + ${labelFor(b)}`,
        type: "calculated_field",
        formula: `${a.key} + ${b.key}`,
        unit: "auto",
        status: "draft",
        description: `Field terhitung dari dua kolom numerik (${valid} baris)`,
      });
    }
  }

  if (rows.length > 0) {
    definitions.push({
      id: "row_count",
      name: "Jumlah Baris",
      type: "aggregate",
      formula: "COUNT(*)",
      unit: "count",
      status: "draft",
      description: "Total baris pada dataset aktif",
    });
    dynamic.row_count = rows.length;
  }

  return {
    definitions,
    values: {
      totalRows: rows.length,
      dynamic,
    },
  };
}

export function formatDynamicMetricValue(id: string, values?: MetricValues): string | null {
  const v = values?.dynamic?.[id];
  if (v == null) return null;
  if (id === "row_count") return formatNumber(v);
  if (Math.abs(v) >= 1_000_000) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);
  }
  return formatNumber(v);
}
