import type { ChartType } from "./types";

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar",
  horizontalBar: "Horizontal bar",
  stackedBar: "Stacked bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
  radial: "Radial",
  scatter: "Scatter",
  treemap: "Treemap",
  radar: "Radar",
  composed: "Composed",
};

export function chartTypeLabel(type: ChartType): string {
  return CHART_TYPE_LABELS[type] ?? type;
}

export const AGGREGATION_LABELS: Record<string, string> = {
  count: "Row count",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

export function aggregationLabel(agg: string): string {
  return AGGREGATION_LABELS[agg] ?? agg;
}
