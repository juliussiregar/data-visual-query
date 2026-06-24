export type ColumnType = "number" | "category" | "text" | "date";

export interface ColumnMeta {
  key: string;
  label: string;
  type: ColumnType;
  uniqueCount: number;
  sampleValues: string[];
  fillRate: number;
}

export type ChartType =
  | "pie"
  | "donut"
  | "bar"
  | "horizontalBar"
  | "line"
  | "area"
  | "radial"
  | "stackedBar"
  | "scatter"
  | "treemap"
  | "radar"
  | "composed";

export const ALL_CHART_TYPES: ChartType[] = [
  "donut",
  "pie",
  "bar",
  "horizontalBar",
  "stackedBar",
  "line",
  "area",
  "radial",
  "scatter",
  "treemap",
  "radar",
  "composed",
];

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  categoryKey: string;
  valueKey?: string;
  aggregation: "count" | "sum" | "avg";
  data: ChartDataPoint[];
  description?: string;
  featured?: boolean;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
  percentage?: number;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: "hash" | "trending" | "activity" | "chart" | "users" | "wallet";
}

export interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface InsightItem {
  id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "highlight";
  metric?: string;
}

export interface TopRecord {
  rank: number;
  label: string;
  sublabel?: string;
  value: number;
  valueFormatted: string;
  badge?: string;
}

export interface SheetData {
  rows: Record<string, string>[];
  columns: ColumnMeta[];
  charts: ChartConfig[];
  kpis: KpiMetric[];
  insights: InsightItem[];
  distributions: DistributionItem[];
  topRecords: TopRecord[];
  sourceUrl: string;
  fetchedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: DashboardAction[];
}

export type ViewId = "overview" | "charts" | "insights" | "data" | "columns";

export type WidgetType =
  | "kpis"
  | "hero_chart"
  | "distribution"
  | "top_records"
  | "insights"
  | "chart";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  visible: boolean;
  order: number;
  span?: 1 | 2 | 3;
  chartId?: string;
  chartType?: ChartType;
  categoryKey?: string;
  valueKey?: string;
  aggregation?: "count" | "sum" | "avg";
  title?: string;
}

export interface DashboardLayout {
  version: 1;
  sheetUrls: string[];
  mergeMode: boolean;
  widgets: WidgetConfig[];
  updatedAt: string;
}

export type DashboardAction =
  | { type: "set_view"; view: ViewId }
  | { type: "set_filter"; column: string; value: string }
  | { type: "set_filters"; filters: Record<string, string> }
  | { type: "clear_filters" }
  | { type: "set_widget_visibility"; widgetId: string; visible: boolean }
  | { type: "set_chart_type"; chartId: string; chartType: ChartType }
  | {
      type: "set_chart_columns";
      chartId: string;
      categoryKey: string;
      valueKey?: string;
      aggregation?: "count" | "sum" | "avg";
    }
  | { type: "reorder_widget"; widgetId: string; order: number }
  | { type: "add_sheet"; url: string }
  | { type: "remove_sheet"; url: string }
  | { type: "set_merge_mode"; enabled: boolean }
  | { type: "reset_layout" };

export interface DashboardContext {
  activeView: ViewId;
  filters: Record<string, string>;
  views: ViewId[];
  filterableColumns: { key: string; label: string; values: string[] }[];
  chartTitles: string[];
  layoutWidgets: { id: string; type: WidgetType; visible: boolean; title: string }[];
  sheetUrls: string[];
  mergeMode: boolean;
  editMode: boolean;
}
