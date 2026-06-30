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
  sourceType: "google_sheets" | "merged" | "postgresql" | "mysql" | "mariadb" | "unknown";
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

export interface ChartSeriesSpec {
  key: string;
  label: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max";
  valueFormat?: "currency" | "number";
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  categoryKey: string;
  valueKey?: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max";
  data: ChartDataPoint[];
  /** Beberapa metrik per kategori (untuk bar bertumpuk / grouped) */
  series?: ChartSeriesSpec[];
  multiSeriesData?: Array<Record<string, string | number> & { name: string }>;
  description?: string;
  featured?: boolean;
  /** Format nilai sumbu/tooltip — default: deteksi dari valueKey */
  valueFormat?: "currency" | "number";
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

export type WidgetProposalOperation = "create" | "update" | "delete";

export interface WidgetProposalCondition {
  column: string;
  operator: import("./visual-query").QueryOperator;
  value: string;
}

export type WidgetProposalConfirmResult = {
  ok: boolean;
  layoutSnapshot?: DashboardLayout;
};

export type WidgetProposalsConfirmResult = {
  ok: boolean;
  appliedCount: number;
  errors: string[];
  layoutSnapshot?: DashboardLayout;
};

export interface WidgetProposal {
  operation: WidgetProposalOperation;
  /** Wajib untuk update/delete (atau pakai widgetRef) */
  widgetId?: string;
  /** Referensi natural: judul widget, bentuk, atau id parsial — alternatif widgetId */
  widgetRef?: string;
  /** Tabel sumber untuk widget ini bila project punya >1 tabel (lihat availableTables di context) */
  sourceTable?: string;
  visualShape?: WidgetVisualShape;
  title?: string;
  layoutWidth?: "full" | "half";
  groupByKey?: string;
  measureKey?: string;
  aggregation?: WidgetAggregation;
  conditions?: WidgetProposalCondition[];
  limit?: number;
  displayColumns?: string[];
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  visible?: boolean;
  /** Pertanyaan validasi ke user sebelum diterapkan */
  validationQuestion: string;
  /** Ringkasan singkat apa yang akan dilakukan */
  summary: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Teks yang ditampilkan di bubble (mis. label chip yang diklik); fallback ke content. */
  displayContent?: string;
  actions?: DashboardAction[];
  widgetProposal?: WidgetProposal;
  /** Beberapa proposal sekaligus (mis. user minta beberapa widget). Item pertama = widgetProposal (kompat). */
  widgetProposals?: WidgetProposal[];
  /** Proposal sudah dikonfirmasi/ditolak user */
  proposalStatus?: "pending" | "confirmed" | "rejected";
  /** Snapshot layout sebelum diterapkan — untuk undo (tidak disimpan ke localStorage) */
  layoutSnapshotBefore?: DashboardLayout;
  /** Fakta dari query engine (deterministik) */
  queryFacts?: AiQueryFact[];
  /** Saran langkah berikutnya dari AI */
  suggestedFollowUps?: SuggestedFollowUp[];
  guardrail?: {
    assumptions: string[];
    sources: string[];
    confidence: "high" | "medium" | "low" | "insufficient";
  };
}

/** Dataset untuk query engine AI — baris yang sama dengan yang user lihat di dashboard */
export interface AiQueryDataset {
  columns: ColumnMeta[];
  rows: Record<string, string>[];
  totalRowCount: number;
  sourceUrl?: string;
  kpis?: KpiMetric[];
  insights?: InsightItem[];
  metrics?: MetricDefinition[];
  metricValues?: MetricValues;
  /** Definisi kolom custom project (rumus tersimpan) */
  derivedFields?: { name: string; key: string; formula: string }[];
}

export interface AiQueryFact {
  tool: string;
  summary: string;
}

export interface SuggestedFollowUp {
  label: string;
  message: string;
  kind?: "analyze" | "widget" | "filter" | "navigate" | "help";
}

export type ViewId =
  | "overview"
  | "charts"
  | "insights"
  | "data"
  | "columns"
  | "projects"
  | "sources"
  | "query"
  | "audit";

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
  /** Preferred width on the overview dashboard */
  layoutWidth?: "full" | "half";
  /** Table widget: preset scroll area height */
  tablePanelHeight?: "sm" | "md" | "lg" | "xl";
  /** Table widget: custom height in px (from drag resize); overrides preset */
  tablePanelHeightPx?: number;
  chartId?: string;
  chartType?: ChartType;
  categoryKey?: string;
  valueKey?: string;
  aggregation?: "count" | "sum" | "avg" | "min" | "max";
  title?: string;
  /** Bentuk visual yang dipilih user (builder langkah 1) */
  visualShape?: WidgetVisualShape;
  /** PostgreSQL table for this widget when project has multiple tables */
  sourceTable?: string;
  /** Konfigurasi data: filter, group by, agregasi */
  dataQuery?: WidgetDataQuery;
  /** Format tampilan nilai: auto = deteksi dari nama kolom, currency = Rp, number = angka biasa */
  valueFormat?: "auto" | "currency" | "number";
}

export type WidgetVisualShape =
  | "stat"
  | "bar"
  | "line"
  | "donut"
  | "ranking"
  | "distribution"
  | "table";

export type WidgetAggregation = "count" | "sum" | "avg" | "min" | "max";

export interface WidgetDataQuery {
  conditions: import("./visual-query").QueryCondition[];
  groupByKey?: string;
  measureKey?: string;
  aggregation: WidgetAggregation;
  sort?: import("./visual-query").QuerySort | null;
  limit?: number;
  /** Table widget: which columns to display */
  displayColumns?: string[];
  /** Table widget: optional summary row at the bottom */
  tableSummary?: TableSummaryConfig;
  /** Query SQL-like dari editor Explore (multi-metrik & filter) */
  visualSql?: string;
}

export type TableSummaryScope = "all_numeric" | "selected";

export interface TableSummaryConfig {
  enabled: boolean;
  aggregation: WidgetAggregation;
  /** all_numeric = every numeric column in the table; selected = pick columns */
  scope: TableSummaryScope;
  columnKeys?: string[];
  label?: string;
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
  | { type: "reset_layout" }
  | { type: "add_derived_field"; name: string; formula: string; key?: string };

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

export type DatabaseType = "postgresql" | "mysql" | "mariadb";

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
  views: ViewId[];
  filterableColumns: { key: string; label: string; values: string[] }[];
  chartTitles: string[];
  layoutWidgets: {
    id: string;
    type: WidgetType;
    visible: boolean;
    title: string;
    visualShape?: WidgetVisualShape;
    groupByKey?: string;
    measureKey?: string;
    aggregation?: string;
    /** Tabel sumber widget bila project multi-tabel */
    sourceTable?: string;
  }[];
  /** Tabel yang tersedia (project multi-tabel). Kosong/undefined = hanya satu tabel. */
  availableTables?: {
    name: string;
    label: string;
    columns: { key: string; label: string }[];
  }[];
  sheetUrls: string[];
  mergeMode: boolean;
  editMode: boolean;
  /** Kolom dihitung yang sudah ada di project */
  derivedFields?: { name: string; key: string; formula: string }[];
}
