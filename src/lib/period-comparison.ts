import { parseNumber, formatNumber } from "./format";
import type { ColumnMeta, KpiMetric } from "./types";

const PERIOD_PATTERNS = /periode|period|quarter|q[1-4]|bulan|month|tahun|year|laporan/i;

export interface PeriodDelta {
  periodKey: string;
  currentPeriod: string;
  previousPeriod: string;
  measureKey: string;
  measureLabel: string;
  currentValue: number;
  previousValue: number;
  delta: number;
  deltaPercent: number;
}

export function detectPeriodColumn(columns: ColumnMeta[]): ColumnMeta | undefined {
  return columns.find(
    (c) =>
      (c.type === "category" || c.type === "date") &&
      PERIOD_PATTERNS.test(c.key) &&
      c.uniqueCount >= 2 &&
      c.uniqueCount <= 12
  );
}

function sumColumn(rows: Record<string, string>[], key: string): number {
  let total = 0;
  for (const row of rows) {
    const n = parseNumber(row[key]);
    if (n !== null) total += n;
  }
  return total;
}

export function computePeriodComparison(
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  periodKey?: string
): { periodColumn: string; deltas: PeriodDelta[] } | null {
  const periodCol = periodKey
    ? columns.find((c) => c.key === periodKey)
    : detectPeriodColumn(columns);
  if (!periodCol) return null;

  const periods = [
    ...new Set(rows.map((r) => r[periodCol.key]?.trim()).filter(Boolean) as string[]),
  ].sort();

  if (periods.length < 2) return null;

  const currentPeriod = periods[periods.length - 1];
  const previousPeriod = periods[periods.length - 2];

  const measures = columns
    .filter((c) => c.type === "number" && c.semanticRole !== "identifier")
    .slice(0, 4);

  const currentRows = rows.filter((r) => r[periodCol.key] === currentPeriod);
  const previousRows = rows.filter((r) => r[periodCol.key] === previousPeriod);

  const deltas: PeriodDelta[] = measures.map((m) => {
    const currentValue = sumColumn(currentRows, m.key);
    const previousValue = sumColumn(previousRows, m.key);
    const delta = currentValue - previousValue;
    const deltaPercent = previousValue !== 0 ? (delta / previousValue) * 100 : 0;
    return {
      periodKey: periodCol.key,
      currentPeriod,
      previousPeriod,
      measureKey: m.key,
      measureLabel: m.businessLabel ?? m.label,
      currentValue,
      previousValue,
      delta,
      deltaPercent,
    };
  });

  return { periodColumn: periodCol.key, deltas };
}

export function periodDeltasToKpis(deltas: PeriodDelta[]): KpiMetric[] {
  return deltas.slice(0, 3).map((d) => ({
    id: `period_${d.measureKey}`,
    label: `${d.measureLabel} (${d.currentPeriod})`,
    value: formatNumber(d.currentValue),
    sublabel: `vs ${d.previousPeriod}: ${d.deltaPercent >= 0 ? "+" : ""}${d.deltaPercent.toFixed(1)}%`,
    trend: d.delta > 0 ? "up" : d.delta < 0 ? "down" : "neutral",
    formula: `SUM(${d.measureKey}) per ${d.periodKey}`,
  }));
}
