import { createWidgetFromShape } from "./widget-catalog";
import { chartTypeToVisualShape } from "./widget-data";
import type { VisualSqlResult } from "./visual-sql";
import type { ChartType, SheetData, WidgetConfig } from "./types";

export type QueryDashboardAddMode = "chart" | "table" | "both";

export function createQueryTableWidget(
  result: VisualSqlResult,
  sql: string,
  data: SheetData,
  maxOrder: number,
  sourceTable?: string
): WidgetConfig | null {
  if (!result.rows.length) return null;

  const keys = Object.keys(result.rows[0]);
  const base = createWidgetFromShape("table", data, maxOrder, sourceTable);

  return {
    ...base,
    title: result.summary || "Hasil query",
    dataQuery: {
      ...base.dataQuery!,
      visualSql: sql.trim() || undefined,
      displayColumns: keys,
      conditions: result.query.conditions,
      limit: result.query.limit,
      sort: result.query.orderBy
        ? {
            columnKey: result.query.orderBy.column,
            direction: result.query.orderBy.direction,
          }
        : base.dataQuery?.sort ?? null,
    },
  };
}

export function createQueryChartWidget(
  result: VisualSqlResult,
  chartType: ChartType,
  sql: string,
  data: SheetData,
  maxOrder: number,
  sourceTable?: string
): WidgetConfig | null {
  if (!result.chart) return null;

  const visualShape = chartTypeToVisualShape(chartType);
  const base = createWidgetFromShape(visualShape, data, maxOrder, sourceTable);

  return {
    ...base,
    title: result.summary,
    chartType,
    visualShape,
    categoryKey: result.chart.categoryKey,
    valueKey: result.chart.measureKey,
    aggregation: result.chart.aggregation,
    dataQuery: {
      ...base.dataQuery!,
      groupByKey: result.chart.categoryKey,
      measureKey: result.chart.measureKey,
      aggregation: result.chart.aggregation,
      conditions: result.query.conditions,
      limit: result.query.limit ?? base.dataQuery?.limit,
      visualSql: sql.trim() || undefined,
      sort: result.query.orderBy
        ? {
            columnKey: result.query.orderBy.column,
            direction: result.query.orderBy.direction,
          }
        : base.dataQuery?.sort ?? null,
    },
  };
}

export function createQueryDashboardWidgets(
  result: VisualSqlResult,
  mode: QueryDashboardAddMode,
  chartType: ChartType,
  sql: string,
  data: SheetData,
  startOrder: number,
  sourceTable?: string
): WidgetConfig[] {
  const widgets: WidgetConfig[] = [];
  let order = startOrder;

  if ((mode === "table" || mode === "both") && result.rows.length > 0) {
    const table = createQueryTableWidget(result, sql, data, order, sourceTable);
    if (table) {
      widgets.push(table);
      order = table.order;
    }
  }

  if ((mode === "chart" || mode === "both") && result.chart) {
    const chart = createQueryChartWidget(result, chartType, sql, data, order, sourceTable);
    if (chart) widgets.push(chart);
  }

  return widgets;
}
