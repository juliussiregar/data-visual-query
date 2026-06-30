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
import { formatNumber, parseNumber, inferColumnIsCurrency, shouldFormatAsCurrency, formatCurrencyFull, formatDisplayValue, formatColumnValue } from "./format";
import { chartConfigFromVisualSqlResult, executeVisualSql } from "./visual-sql";

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

export function defaultTableDisplayColumns(columns: Pick<ColumnMeta, "key">[]): string[] {
  return columns.map((c) => c.key.trim()).filter(Boolean);
}

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

export function buildChartFromVisualSqlWidget(data: SheetData, widget: WidgetConfig): ChartConfig | null {
  const sql = widget.dataQuery?.visualSql;
  if (!sql?.trim()) return null;
  const result = executeVisualSql(data, sql);
  if (result.error || !result.chart) return null;
  return chartConfigFromVisualSqlResult(
    result,
    data.columns,
    widget.chartType ?? shapeToChartType(widget.visualShape) ?? "bar",
    widget.chartId ?? widget.id
  );
}

export function buildChartFromWidget(data: SheetData, widget: WidgetConfig): ChartConfig | null {
  const visualSqlChart = buildChartFromVisualSqlWidget(data, widget);
  if (visualSqlChart) return visualSqlChart;

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
  const measureCol = measure ? data.columns.find((c) => c.key === measure) : undefined;
  const valueFormat =
    widget.valueFormat === "currency" || widget.valueFormat === "number"
      ? widget.valueFormat
      : measureCol && inferColumnIsCurrency(measureCol)
        ? ("currency" as const)
        : ("number" as const);

  return {
    id: widget.chartId ?? widget.id,
    title: widget.title ?? `Grafik per ${catLabel}`,
    type: chartType,
    categoryKey: groupBy,
    valueKey: measure,
    aggregation: q.aggregation,
    data: chartData.slice(0, limit),
    description: `${AGGREGATION_LABELS[q.aggregation]} · ${catLabel}`,
    valueFormat,
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

  const measureCol = data.columns.find((c) => c.key === measure);
  const fmtMode = widget.valueFormat ?? "auto";
  const isCurrency = shouldFormatAsCurrency(
    measureCol ?? { key: measure ?? "", label: widget.title ?? "" },
    fmtMode
  );
  const fmt = (n: number) => (isCurrency ? formatCurrencyFull(n) : formatDisplayValue(n));

  const colLabel = measureCol?.label ?? measure;
  return {
    label: widget.title ?? `${AGGREGATION_LABELS[q.aggregation]} ${colLabel}`,
    value: fmt(value),
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

  const sortCol = data.columns.find((c) => c.key === sortKey);

  return sorted.slice(0, limit).map((row, i) => {
    const raw = row[sortKey] ?? "";
    const num = parseNumber(raw) ?? (parseFloat(raw.replace(/[^\d.-]/g, "")) || 0);
    return {
      rank: i + 1,
      label: row[labelCol] ?? `Baris ${i + 1}`,
      value: num,
      valueFormatted: sortCol ? formatColumnValue(sortCol, raw || num) : formatDisplayValue(num),
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
        : inferColumnIsCurrency(col)
          ? formatCurrencyFull(value)
          : formatNumber(value);
  }

  return result;
}

export function buildTableFromVisualSqlWidget(
  data: SheetData,
  widget: WidgetConfig
): {
  rows: Record<string, string>[];
  columns: ColumnMeta[];
  summaryRow?: Record<string, string>;
  totalRows: number;
} | null {
  const sql = widget.dataQuery?.visualSql;
  if (!sql?.trim()) return null;

  const result = executeVisualSql(data, sql);
  if (result.error || !result.rows.length) return null;

  const keys =
    widget.dataQuery?.displayColumns?.filter(Boolean) ??
    Object.keys(result.rows[0]);

  const columns: ColumnMeta[] = keys.map((key) => {
    const sample = result.rows.find((row) => row[key] !== "" && row[key] !== undefined)?.[key];
    const num = typeof sample === "number" ? sample : parseNumber(String(sample ?? ""));
    return {
      key,
      label: key,
      type: num !== null ? ("number" as const) : ("category" as const),
      uniqueCount: 0,
      sampleValues: [],
      fillRate: 100,
    };
  });

  const rows = result.rows.map((row) =>
    Object.fromEntries(
      keys.map((key) => {
        const value = row[key];
        return [key, value === null || value === undefined ? "" : String(value)];
      })
    )
  );

  const q = resolvedQuery(widget);
  if (q.sort?.columnKey) {
    const key = q.sort.columnKey;
    const dir = q.sort.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const an = parseFloat(av.replace(/[^\d.-]/g, ""));
      const bn = parseFloat(bv.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });
  }

  const limit = q.limit;
  const limitedRows = limit ? rows.slice(0, limit) : rows;

  const displayCols = columns.filter((c) => keys.includes(c.key));
  const summaryRow =
    q.tableSummary?.enabled && displayCols.length > 0
      ? computeTableSummaryRow(limitedRows, displayCols, q.tableSummary)
      : undefined;

  return {
    rows: limitedRows,
    columns: displayCols,
    summaryRow,
    totalRows: limitedRows.length,
  };
}

export function buildTableFromWidget(
  data: SheetData,
  widget: WidgetConfig
): {
  rows: Record<string, string>[];
  columns: SheetData["columns"];
  summaryRow?: Record<string, string>;
  totalRows: number;
} {
  const fromQuery = buildTableFromVisualSqlWidget(data, widget);
  if (fromQuery) return fromQuery;

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
  const columns =
    q.displayColumns && q.displayColumns.length > 0
      ? q.displayColumns
          .map((key) => allCols.find((c) => c.key === key))
          .filter((c): c is (typeof allCols)[number] => !!c)
      : allCols.slice(0, 6);

  const summaryRow =
    q.tableSummary?.enabled && columns.length > 0
      ? computeTableSummaryRow(rows, columns, q.tableSummary)
      : undefined;

  return {
    rows,
    columns,
    summaryRow,
    totalRows: rows.length,
  };
}

function shapeToChartType(shape?: WidgetVisualShape): ChartType | undefined {
  switch (shape) {
    case "bar":
      return "bar";
    case "line":
      return "line";
    case "donut":
      return "donut";
    case "distribution":
      return "horizontalBar";
    default:
      return undefined;
  }
}

/** Map chart type dari gallery ke visual shape widget dashboard. */
export function chartTypeToVisualShape(chartType: ChartType): WidgetVisualShape {
  switch (chartType) {
    case "line":
    case "area":
      return "line";
    case "pie":
    case "donut":
      return "donut";
    case "horizontalBar":
      return "distribution";
    default:
      return "bar";
  }
}

export function widgetPreviewSummary(data: SheetData, widget: WidgetConfig): string {
  const rows = getWidgetRows(data, widget);
  const q = resolvedQuery(widget);

  if (widget.visualShape === "table") {
    if (q.visualSql) {
      const fromQuery = buildTableFromVisualSqlWidget(data, widget);
      const colCount = fromQuery?.columns.length ?? q.displayColumns?.length ?? 0;
      return `${(fromQuery?.totalRows ?? 0).toLocaleString()} baris hasil query · ${colCount} kolom`;
    }
    const colCount = q.displayColumns?.length ?? Math.min(6, data.columns.length);
    const summary = q.tableSummary?.enabled
      ? ` · ${q.tableSummary.label ?? AGGREGATION_LABELS[q.tableSummary.aggregation]} row`
      : "";
    return `${rows.length.toLocaleString()} matching rows · scroll · ${colCount} columns${summary}`;
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

  if (shape === "table" && (!q.displayColumns || q.displayColumns.length === 0) && !q.visualSql) {
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
