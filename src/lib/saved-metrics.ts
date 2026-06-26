import { evaluateAggregateFormula } from "./formula-engine";
import type { ColumnMeta, MetricDefinition, MetricValues } from "./types";
import type { SavedMetric } from "./metrics-storage";

export function evaluateSavedMetric(
  metric: MetricDefinition,
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): number | null {
  return evaluateAggregateFormula(metric.formula, rows, columns);
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
    type:
      formula.includes("+") || formula.includes("-") || formula.includes("/")
        ? "calculated_field"
        : "aggregate",
    formula,
    unit,
    status: "draft",
    description: "Metric kustom pengguna",
    createdAt: new Date().toISOString(),
    createdBy,
  };
}
