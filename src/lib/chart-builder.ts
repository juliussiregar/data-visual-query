import { aggregateData } from "./analyzer";
import type { ChartConfig, ChartType, SheetData, WidgetConfig } from "./types";

export function findChartById(data: SheetData, chartId: string): ChartConfig | undefined {
  return data.charts.find((c) => c.id === chartId);
}

export function resolveChartForWidget(
  data: SheetData,
  widget: WidgetConfig
): ChartConfig | null {
  if (widget.type === "hero_chart") {
    const base =
      (widget.chartId ? findChartById(data, widget.chartId) : undefined) ??
      data.charts.find((c) => c.featured) ??
      data.charts[0];
    if (!base) return null;
    return applyWidgetOverrides(data, base, widget);
  }

  if (widget.type !== "chart" || !widget.chartId) return null;
  const base = findChartById(data, widget.chartId);
  if (!base) return null;
  return applyWidgetOverrides(data, base, widget);
}

function applyWidgetOverrides(
  data: SheetData,
  base: ChartConfig,
  widget: WidgetConfig
): ChartConfig {
  const categoryKey = widget.categoryKey ?? base.categoryKey;
  const valueKey = widget.valueKey ?? base.valueKey;
  const aggregation = widget.aggregation ?? base.aggregation;
  const chartType = widget.chartType ?? base.type;
  const title = widget.title ?? base.title;

  const needsRebuild =
    categoryKey !== base.categoryKey ||
    valueKey !== base.valueKey ||
    aggregation !== base.aggregation;

  const chartData = needsRebuild
    ? aggregateData(data.rows, categoryKey, valueKey, aggregation)
    : base.data;

  return {
    ...base,
    id: widget.chartId ?? base.id,
    title,
    type: chartType,
    categoryKey,
    valueKey,
    aggregation,
    data: chartData.slice(0, 12),
  };
}

export function buildCustomChart(
  data: SheetData,
  opts: {
    id: string;
    title: string;
    categoryKey: string;
    valueKey?: string;
    aggregation: "count" | "sum" | "avg";
    chartType: ChartType;
  }
): ChartConfig | null {
  const chartData = aggregateData(
    data.rows,
    opts.categoryKey,
    opts.valueKey,
    opts.aggregation
  );
  if (chartData.length < 1) return null;

  const catLabel = data.columns.find((c) => c.key === opts.categoryKey)?.label ?? opts.categoryKey;
  return {
    id: opts.id,
    title: opts.title,
    type: opts.chartType,
    categoryKey: opts.categoryKey,
    valueKey: opts.valueKey,
    aggregation: opts.aggregation,
    data: chartData.slice(0, 12),
    description: `Grafik ${opts.aggregation} berdasarkan ${catLabel}`,
  };
}
