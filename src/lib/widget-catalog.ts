import type { ChartType, WidgetConfig, WidgetType, WidgetVisualShape } from "./types";
import type { SheetData } from "./types";
import { EMPTY_WIDGET_DATA_QUERY, defaultTableDisplayColumns } from "./widget-data";
import { defaultLayoutWidth } from "./widget-layout";

export interface WidgetShapeDef {
  id: WidgetVisualShape;
  label: string;
  description: string;
  widgetType: WidgetType;
  chartType?: ChartType;
  needsGroupBy: boolean;
  needsAggregation: boolean;
}

export const WIDGET_SHAPES: WidgetShapeDef[] = [
  {
    id: "stat",
    label: "Big Number",
    description: "One headline metric (total, average, count…)",
    widgetType: "chart",
    needsGroupBy: false,
    needsAggregation: true,
  },
  {
    id: "bar",
    label: "Bar Chart",
    description: "Compare categories side by side",
    widgetType: "chart",
    chartType: "bar",
    needsGroupBy: true,
    needsAggregation: true,
  },
  {
    id: "line",
    label: "Line Chart",
    description: "Show trends over categories",
    widgetType: "chart",
    chartType: "line",
    needsGroupBy: true,
    needsAggregation: true,
  },
  {
    id: "donut",
    label: "Donut Chart",
    description: "Share of each category",
    widgetType: "chart",
    chartType: "donut",
    needsGroupBy: true,
    needsAggregation: true,
  },
  {
    id: "distribution",
    label: "Distribution",
    description: "Horizontal bars by group",
    widgetType: "distribution",
    needsGroupBy: true,
    needsAggregation: true,
  },
  {
    id: "ranking",
    label: "Top List",
    description: "Ranked rows by a numeric column",
    widgetType: "top_records",
    needsGroupBy: false,
    needsAggregation: false,
  },
  {
    id: "table",
    label: "Data Table",
    description: "Filtered rows with chosen columns",
    widgetType: "chart",
    needsGroupBy: false,
    needsAggregation: false,
  },
];

export const WIDGET_SHAPE_GROUPS: {
  label: string;
  description: string;
  ids: WidgetVisualShape[];
}[] = [
  {
    label: "Numbers",
    description: "Single KPI-style values",
    ids: ["stat"],
  },
  {
    label: "Charts",
    description: "Visual comparisons",
    ids: ["bar", "line", "donut", "distribution"],
  },
  {
    label: "Lists & tables",
    description: "Rows you can scan",
    ids: ["ranking", "table"],
  },
];

export function getShapeDef(id: WidgetVisualShape): WidgetShapeDef | undefined {
  return WIDGET_SHAPES.find((s) => s.id === id);
}

export function createWidgetFromShape(
  shapeId: WidgetVisualShape,
  data: SheetData,
  maxOrder: number,
  sourceTable?: string
): WidgetConfig {
  const shape = getShapeDef(shapeId)!;
  const categoryCol = data.columns.find((c) => c.type === "category" || c.type === "text");
  const numericCol = data.columns.find((c) => c.type === "number");
  const groupBy = categoryCol?.key;
  const measure = numericCol?.key;
  const defaultColumns = defaultTableDisplayColumns(data.columns);

  return {
    id: `w-${crypto.randomUUID()}`,
    type: shape.widgetType,
    visualShape: shapeId,
    visible: true,
    order: maxOrder + 1,
    layoutWidth: defaultLayoutWidth(shapeId),
    span: shapeId === "stat" ? 1 : shapeId === "bar" || shapeId === "line" || shapeId === "table" ? 2 : 1,
    chartType: shape.chartType,
    categoryKey: groupBy,
    valueKey: measure,
    aggregation: "count",
    title: shape.label,
    ...(sourceTable ? { sourceTable } : {}),
    dataQuery: {
      ...EMPTY_WIDGET_DATA_QUERY,
      groupByKey: groupBy,
      measureKey: measure,
      aggregation: shapeId === "stat" && measure ? "sum" : "count",
      limit: shapeId === "ranking" ? 10 : shapeId === "table" ? undefined : 12,
      displayColumns: shapeId === "table" ? defaultColumns : undefined,
      sort:
        shapeId === "ranking" && measure
          ? { columnKey: measure, direction: "desc" }
          : shapeId === "table" && defaultColumns[0]
            ? { columnKey: defaultColumns[0], direction: "asc" }
            : null,
    },
  };
}
