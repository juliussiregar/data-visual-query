import type {
  ChartConfig,
  ChartType,
  ColumnMeta,
  SheetData,
  TableSummaryConfig,
  WidgetConfig,
  WidgetDataQuery,
  WidgetVisualShape,
} from "./types";
import { aggregateData, CHART_COLORS } from "./aggregation";
import { applyVisualQuery, type VisualQuery } from "./visual-query";
import { formatNumber, parseNumber } from "./format";

export const EMPTY_WIDGET_DATA_QUERY: WidgetDataQuery = {
  conditions: [],
  aggregation: "count",
  sort: null,
  limit: 12,
};

export const AGGREGATION_LABELS: Record<WidgetDataQuery["aggregation"], string> = {
  count: "Count rows",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

export function getWidgetRows(data: SheetData, widget: WidgetConfig): Record<string, string>[] {
  const q = widget.dataQuery;
  if (!q || q.conditions.length === 0) return data.rows;
  const visualQuery: VisualQuery = {
    searchText: "",
    conditions: q.conditions,
    sort: null,
  };
  return applyVisualQuery(data.rows, visualQuery, data.columns);
}

function resolvedQuery(widget: WidgetConfig): WidgetDataQuery {
  return {
    ...EMPTY_WIDGET_DATA_QUERY,
    ...widget.dataQuery,
    groupByKey: widget.dataQuery?.groupByKey ?? widget.categoryKey,
    measureKey: widget.dataQuery?.measureKey ?? widget.valueKey,
    aggregation: widget.dataQuery?.aggregation ?? widget.aggregation ?? "count",
  };
}

export function buildChartFromWidget(data: SheetData, widget: WidgetConfig): ChartConfig | null {
  const rows = getWidgetRows(data, widget);
  const q = resolvedQuery(widget);
  const groupBy = q.groupByKey ?? data.columns.find((c) => c.type === "category")?.key;
  if (!groupBy) return null;

  const measure = q.aggregation === "count" ? undefined : q.measureKey;
  let chartData = aggregateData(rows, groupBy, measure, q.aggregation);

  if (q.sort?.columnKey) {
    const key = q.sort.columnKey;
    const dir = q.sort.direction === "asc" ? 1 : -1;
    chartData = [...chartData].sort((a, b) => {
      const av = key === groupBy ? a.name : a.value;
      const bv = key === groupBy ? b.name : b.value;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "id", { numeric: true }) * dir;
    });
  } else {
    chartData = [...chartData].sort((a, b) => b.value - a.value);
  }

  const limit = q.limit ?? 12;
  const chartType = widget.chartType ?? shapeToChartType(widget.visualShape) ?? "bar";
  const catLabel = data.columns.find((c) => c.key === groupBy)?.label ?? groupBy;

  return {
    id: widget.chartId ?? widget.id,
    title: widget.title ?? `Grafik per ${catLabel}`,
    type: chartType,
    categoryKey: groupBy,
    valueKey: measure,
    aggregation: q.aggregation,
    data: chartData.slice(0, limit),
    description: `${AGGREGATION_LABELS[q.aggregation]} · ${catLabel}`,
  };
}

export function buildStatFromWidget(
  data: SheetData,
  widget: WidgetConfig
): { label: string; value: string } | null {
  const rows = getWidgetRows(data, widget);
  const q = resolvedQuery(widget);
  const measure = q.measureKey ?? data.columns.find((c) => c.type === "number")?.key;

  if (q.aggregation === "count") {
    return { label: widget.title ?? "Jumlah", value: rows.length.toLocaleString("id-ID") };
  }
  if (!measure) return { label: widget.title ?? "Jumlah", value: rows.length.toLocaleString("id-ID") };

  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const raw = row[measure]?.replace(/[^\d.-]/g, "");
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) continue;
    sum += n;
    count += 1;
    min = Math.min(min, n);
    max = Math.max(max, n);
  }
  if (count === 0) return null;

  let value: number;
  switch (q.aggregation) {
    case "sum":
      value = sum;
      break;
    case "avg":
      value = sum / count;
      break;
    case "min":
      value = min;
      break;
    case "max":
      value = max;
      break;
    default:
      value = count;
  }

  const colLabel = data.columns.find((c) => c.key === measure)?.label ?? measure;
  return {
    label: widget.title ?? `${AGGREGATION_LABELS[q.aggregation]} ${colLabel}`,
    value: Number.isInteger(value) ? value.toLocaleString("id-ID") : value.toLocaleString("id-ID", { maximumFractionDigits: 2 }),
  };
}

export function buildDistributionFromWidget(data: SheetData, widget: WidgetConfig) {
  const chart = buildChartFromWidget(data, { ...widget, chartType: "bar" });
  if (!chart) return data.distributions;
  return chart.data.map((d, i) => ({
    label: d.name,
    value: d.value,
    percentage: d.percentage ?? 0,
    color: d.fill ?? CHART_COLORS[i % CHART_COLORS.length],
  }));
}

export function buildTopRecordsFromWidget(data: SheetData, widget: WidgetConfig) {
  const rows = getWidgetRows(data, widget);
  const q = resolvedQuery(widget);
  const sortKey = q.sort?.columnKey ?? q.measureKey ?? data.columns.find((c) => c.type === "number")?.key;
  if (!sortKey) return data.topRecords;

  const sorted = [...rows].sort((a, b) => {
    const an = parseFloat((a[sortKey] ?? "").replace(/[^\d.-]/g, "")) || 0;
    const bn = parseFloat((b[sortKey] ?? "").replace(/[^\d.-]/g, "")) || 0;
    return q.sort?.direction === "asc" ? an - bn : bn - an;
  });

  const limit = q.limit ?? 10;
  const labelCol =
    q.groupByKey ?? data.columns.find((c) => c.type === "category" || c.type === "text")?.key ?? sortKey;

  const badgeCol = data.columns.find((c) => c.type === "category")?.key;

  return sorted.slice(0, limit).map((row, i) => {
    const raw = row[sortKey] ?? "";
    const num = parseFloat(raw.replace(/[^\d.-]/g, "")) || 0;
    return {
      rank: i + 1,
      label: row[labelCol] ?? `Baris ${i + 1}`,
      value: num,
      valueFormatted: raw || num.toLocaleString("id-ID"),
      badge: badgeCol && badgeCol !== labelCol ? row[badgeCol] : undefined,
    };
  });
}

function summaryTargetKeys(
  columns: ColumnMeta[],
  summary: TableSummaryConfig
): Set<string> {
  if (summary.scope === "selected" && summary.columnKeys?.length) {
    return new Set(summary.columnKeys);
  }
  return new Set(columns.filter((c) => c.type === "number").map((c) => c.key));
}

export function computeTableSummaryRow(
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  summary: TableSummaryConfig
): Record<string, string> {
  const targets = summaryTargetKeys(columns, summary);
  const label = summary.label?.trim() || AGGREGATION_LABELS[summary.aggregation];
  const result: Record<string, string> = {};

  for (const col of columns) {
    const isLabelCol = col.key === columns[0]?.key;
    if (isLabelCol) {
      result[col.key] = label;
      continue;
    }

    if (!targets.has(col.key)) {
      result[col.key] = "";
      continue;
    }

    const nums = rows
      .map((r) => parseNumber(r[col.key]))
      .filter((n): n is number => n !== null);

    if (nums.length === 0) {
      result[col.key] = "—";
      continue;
    }

    let value: number;
    switch (summary.aggregation) {
      case "sum":
        value = nums.reduce((a, b) => a + b, 0);
        break;
      case "avg":
        value = nums.reduce((a, b) => a + b, 0) / nums.length;
        break;
      case "min":
        value = Math.min(...nums);
        break;
      case "max":
        value = Math.max(...nums);
        break;
      case "count":
        value = nums.length;
        break;
      default:
        value = 0;
    }

    result[col.key] =
      summary.aggregation === "count"
        ? String(Math.round(value))
        : formatNumber(value);
  }

  return result;
}

export function buildTableFromWidget(
  data: SheetData,
  widget: WidgetConfig
): {
  rows: Record<string, string>[];
  columns: SheetData["columns"];
  summaryRow?: Record<string, string>;
} {
  const q = resolvedQuery(widget);
  let rows = getWidgetRows(data, widget);

  if (q.sort?.columnKey) {
    const key = q.sort.columnKey;
    const dir = q.sort.direction === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const an = parseFloat(av.replace(/[^\d.-]/g, ""));
      const bn = parseFloat(bv.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });
  }

  const allCols = data.columns.filter((c) => c.key.trim());
  const limit = q.limit ?? 15;
  const columns =
    q.displayColumns && q.displayColumns.length > 0
      ? q.displayColumns
          .map((key) => allCols.find((c) => c.key === key))
          .filter((c): c is (typeof allCols)[number] => !!c)
      : allCols.slice(0, 6);

  const displayRows = limit > 0 ? rows.slice(0, limit) : rows;

  const summaryRow =
    q.tableSummary?.enabled && columns.length > 0
      ? computeTableSummaryRow(rows, columns, q.tableSummary)
      : undefined;

  return { rows: displayRows, columns, summaryRow };
}

function shapeToChartType(shape?: WidgetVisualShape): ChartType | undefined {
  switch (shape) {
    case "bar":
      return "bar";
    case "line":
      return "line";
    case "donut":
      return "donut";
    default:
      return undefined;
  }
}

export function widgetPreviewSummary(data: SheetData, widget: WidgetConfig): string {
  const rows = getWidgetRows(data, widget);
  const q = resolvedQuery(widget);

  if (widget.visualShape === "table") {
    const colCount = q.displayColumns?.length ?? Math.min(6, data.columns.length);
    const summary = q.tableSummary?.enabled
      ? ` · ${q.tableSummary.label ?? AGGREGATION_LABELS[q.tableSummary.aggregation]} row`
      : "";
    const limitLabel = q.limit === 0 ? "all" : String(q.limit ?? 15);
    return `${rows.length.toLocaleString()} matching rows · showing ${limitLabel} · ${colCount} columns${summary}`;
  }

  const parts: string[] = [`${rows.length.toLocaleString()} rows`];
  if (q.groupByKey) {
    const col = data.columns.find((c) => c.key === q.groupByKey);
    parts.push(`by ${col?.label ?? q.groupByKey}`);
  }
  if (widget.visualShape !== "ranking") {
    parts.push(AGGREGATION_LABELS[q.aggregation].toLowerCase());
  }
  return parts.join(" · ");
}

export function validateWidgetConfig(
  widget: WidgetConfig,
  data: SheetData
): string | null {
  if (!widget.visualShape) return null;

  const q = resolvedQuery(widget);
  const shape = widget.visualShape;

  if (["bar", "line", "donut", "distribution"].includes(shape) && !q.groupByKey) {
    return "Choose a column to group by.";
  }

  if (
    shape !== "table" &&
    shape !== "ranking" &&
    q.aggregation !== "count" &&
    !q.measureKey
  ) {
    const hasNumeric = data.columns.some((c) => c.type === "number");
    if (hasNumeric) {
      return "Choose a numeric column to calculate.";
    }
  }

  if (shape === "ranking") {
    const sortKey =
      q.sort?.columnKey ?? q.measureKey ?? data.columns.find((c) => c.type === "number")?.key;
    if (!sortKey) {
      return "Choose a column to sort the list by.";
    }
  }

  if (shape === "table" && (!q.displayColumns || q.displayColumns.length === 0)) {
    return "Select at least one column to display.";
  }

  for (const cond of q.conditions) {
    if (!cond.columnKey) return "Pick a column for each filter, or remove empty filters.";
    if (cond.operator !== "is_empty" && cond.operator !== "is_not_empty" && !cond.value?.trim()) {
      return "Enter a value for each filter, or remove incomplete filters.";
    }
  }

  return null;
}
