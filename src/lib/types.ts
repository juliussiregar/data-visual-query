export type ColumnType = "number" | "category" | "text" | "date";

export type SemanticRole =
  | "dimension"
  | "measure"
  | "date"
  | "identifier"
  | "sensitive"
  | "information";

export type FreshnessStatus = "healthy" | "warning" | "critical" | "unknown";

export type DatasetSchemaId = "generic";

export interface ColumnLineage {
  sourceType: "google_sheets" | "merged" | "join" | "mock_db" | "derived";
  sourceLabel: string;
  sourceField: string;
  note?: string;
}

export interface ColumnMeta {
  key: string;
  label: string;
  type: ColumnType;
  uniqueCount: number;
  sampleValues: string[];
  fillRate: number;
  semanticRole?: SemanticRole;
  sensitive?: boolean;
  businessLabel?: string;
  description?: string;
  nullCount?: number;
  duplicateCount?: number;
  lineage?: ColumnLineage;
}

export type DataQualitySeverity = "info" | "warning" | "critical";

export interface DataQualityIssue {
  id: string;
  ruleId: string;
  severity: DataQualitySeverity;
  title: string;
  description: string;
  columnKey?: string;
}

export interface DataQualityReport {
  score: number;
  issueCount: number;
  criticalCount: number;
  issues: DataQualityIssue[];
  checkedAt: string;
}

export interface DatasetMeta {
  name: string;
  sourceType: "google_sheets" | "merged" | "postgresql" | "unknown";
  sourceUrl: string;
  schemaId: DatasetSchemaId;
  fetchedAt: string;
  freshness: {
    status: FreshnessStatus;
    label: string;
    fetchedAt: string;
    ageMinutes: number;
    staleThresholdMinutes: number;
  };
  profile: {
    rowCount: number;
    filteredRowCount?: number;
    columnCount: number;
    dimensionCount: number;
    measureCount: number;
    sensitiveFieldCount: number;
    nullCellRate: number;
  };
  quality?: DataQualityReport;
  lineageSummary?: string;
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
  metricId?: string;
  formula?: string;
  certified?: boolean;
}

export type MetricStatus = "draft" | "certified" | "deprecated";

export type MetricDefinitionType = "calculated_field" | "aggregate";

export interface MetricDefinition {
  id: string;
  name: string;
  type: MetricDefinitionType;
  formula: string;
  unit: string;
  status: MetricStatus;
  description?: string;
}

export interface MetricValues {
  totalOutstanding?: number;
  outstandingNpl?: number;
  rasioNpl?: number;
  totalTunggakan?: number;
  nplCount?: number;
  activeCount?: number;
  totalRows: number;
  totalPlafond?: number;
  approvalRate?: number;
  approvedCount?: number;
  slaBreach?: number;
  /** Nilai agregat auto-detect untuk sheet generic (key = metric id) */
  dynamic?: Record<string, number>;
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
  dataset?: DatasetMeta;
  metrics?: MetricDefinition[];
  metricValues?: MetricValues;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: DashboardAction[];
  guardrail?: {
    assumptions: string[];
    sources: string[];
    confidence: "high" | "medium" | "low" | "insufficient";
  };
}

export type ViewId = "overview" | "charts" | "insights" | "data" | "columns" | "sources" | "sql";

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

export type DataAlertSeverity = "info" | "warning" | "critical";

export interface DataAlert {
  id: string;
  severity: DataAlertSeverity;
  title: string;
  description: string;
}

/** Pembatasan baris per dimensi (simulasi role/akses cabang) */
export interface DataScope {
  columnKey: string;
  values: string[];
}

export type DatabaseType = "postgresql";

export interface DatabaseConnectionProfile {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  /** Hanya jika user centang simpan password (PoC — browser) */
  password?: string;
  rememberPassword: boolean;
  ssl: boolean;
  schema: string;
  createdAt: string;
  lastTestedAt?: string;
  lastTestStatus?: "success" | "failed";
  lastTestMessage?: string;
}

export interface DashboardContext {
  activeView: ViewId;
  filters: Record<string, string>;
  dataScope: DataScope | null;
  totalRowCount: number;
  userRole: "viewer" | "analyst" | "admin";
  certifiedMetricsOnly: boolean;
  views: ViewId[];
  filterableColumns: { key: string; label: string; values: string[] }[];
  chartTitles: string[];
  layoutWidgets: { id: string; type: WidgetType; visible: boolean; title: string }[];
  sheetUrls: string[];
  mergeMode: boolean;
  editMode: boolean;
}
