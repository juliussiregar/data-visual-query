"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import type { SheetData, ViewId, DashboardLayout, DashboardAction, DataScope } from "@/lib/types";
import { reanalyze, getFilterableColumns, type Filters } from "@/lib/filters";
import { applyDataScope, isScopeActive, scopeLabel } from "@/lib/data-scope";
import { loadDataScope, saveDataScope } from "@/lib/data-scope-storage";
import { computeDataAlerts } from "@/lib/alerts";
import { findColumnKey, applyLayoutActions } from "@/lib/chat-actions";
import { LinkInput } from "./LinkInput";
import { ChartCard } from "./ChartCard";
import { DataTable } from "./DataTable";
import { FloatingChatWidget } from "./FloatingChatWidget";
import { Sidebar, navItemsForRole } from "./Sidebar";
import { FilterBar } from "./FilterBar";
import { ColumnInsights } from "./ColumnInsights";
import { DatasetCatalogPanel } from "./DatasetCatalogPanel";
import { MetricsLibraryPanel } from "./MetricsLibraryPanel";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { LandingFeatures } from "./LandingFeatures";
import { SectionHeader } from "./SectionHeader";
import { SavedSheetsMenu } from "./SavedSheetsMenu";
import { InsightsPanel } from "./InsightsPanel";
import { StatusDistribution } from "./StatusDistribution";
import { TopRecords } from "./TopRecords";
import { UserMenu } from "./UserMenu";
import { LoginPage } from "./LoginPage";
import { PeriodComparisonPanel } from "./PeriodComparisonPanel";
import { DataSourcePanel } from "./DataSourcePanel";
import { SqlQueryPanel } from "./SqlQueryPanel";
import { AuditLogPanel } from "./AuditLogPanel";
import { JoinFunnelBanner } from "./JoinFunnelBanner";
import { AutoRefreshBar } from "./AutoRefreshBar";
import { MetricGlossaryPanel } from "./MetricGlossaryPanel";
import { DataQualityPanel } from "./DataQualityPanel";
import { ScheduledReportBar } from "./ScheduledReportBar";
import { CertifiedMetricsToggle } from "./CertifiedMetricsToggle";
import {
  getSheetFromUrl,
  syncSheetToUrl,
  touchSavedSheetRemote,
  fetchSavedSheets,
  saveSheetRemote,
  truncateUrl,
} from "@/lib/sheet-storage";
import { OverviewDashboard } from "./OverviewDashboard";
import {
  createDefaultLayout,
  mergeLayoutWithData,
  applyLayoutTemplate,
  type LayoutTemplateId,
} from "@/lib/layout";
import { DrillThroughBanner } from "./DrillThroughBanner";
import { DataScopeBar } from "./DataScopeBar";
import { DataAlertsPanel } from "./DataAlertsPanel";
import {
  fetchRemoteLayout,
  getLayoutKey,
  syncLayoutKeyToUrl,
  copyDashboardShareUrl,
} from "@/lib/layout-storage";
import { useLayoutAutoSave, type LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import { getScopeFromUrl, syncScopeToUrl } from "@/lib/scope-url";
import { rolePermissions } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { logAuditClient } from "@/lib/audit-log";
import {
  loadSavedMetrics,
  upsertSavedMetric,
  removeSavedMetric,
  mergeMetricDefinitions,
  type SavedMetric,
} from "@/lib/metrics-storage";
import { computeSavedMetricValues } from "@/lib/saved-metrics";
import { computePeriodComparison } from "@/lib/period-comparison";
import type { JoinConfig } from "@/lib/join-sheets";
import {
  useAutoRefresh,
  loadAutoRefreshMinutes,
  saveAutoRefreshMinutes,
  type AutoRefreshInterval,
} from "@/hooks/useAutoRefresh";
import {
  buildCsvFromRows,
  downloadCsv,
  loadReportScheduleMinutes,
  saveReportScheduleMinutes,
  type ReportScheduleInterval,
} from "@/lib/report-schedule";
import {
  loadCertifiedMetricsOnly,
  saveCertifiedMetricsOnly,
} from "@/lib/certified-metrics-mode";
import { cn } from "@/lib/utils";

interface FunnelMetrics {
  totalPengajuan: number;
  approved: number;
  conversionRate: number;
  joinedRowCount: number;
  joinConfig: JoinConfig;
}

export function DashboardApp() {
  const searchParams = useSearchParams();
  const initRef = useRef(false);
  const auth = useAuth();

  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [filters, setFilters] = useState<Filters>({});
  const [lastUrl, setLastUrl] = useState("");
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [syncStatus, setSyncStatus] = useState<LayoutSyncStatus>("synced");
  const [linkCopied, setLinkCopied] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(true);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [overviewBuilderOpen, setOverviewBuilderOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<LayoutTemplateId | null>(null);
  const [drillFilter, setDrillFilter] = useState<{ column: string; value: string } | null>(null);
  const [dataScope, setDataScope] = useState<DataScope | null>(null);
  const [savedMetrics, setSavedMetrics] = useState<SavedMetric[]>([]);
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics | null>(null);
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<AutoRefreshInterval>(0);
  const [reportScheduleMinutes, setReportScheduleMinutes] =
    useState<ReportScheduleInterval>(0);
  const [certifiedMetricsOnly, setCertifiedMetricsOnly] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<Date | null>(null);

  const userRole = auth.user?.role ?? "analyst";
  const perms = rolePermissions(userRole);

  useEffect(() => {
    setAutoRefreshMinutes(loadAutoRefreshMinutes());
    setReportScheduleMinutes(loadReportScheduleMinutes());
    setCertifiedMetricsOnly(loadCertifiedMetricsOnly());
  }, []);

  useEffect(() => {
    if (activeView !== "overview") {
      setOverviewBuilderOpen(false);
    }
  }, [activeView]);

  const persistSheetOnLoad = useCallback((url: string) => {
    syncSheetToUrl(url);
    void touchSavedSheetRemote(url);
    void saveSheetRemote(url);
  }, []);

  const initLayout = useCallback(async (data: SheetData, urls: string[]) => {
    const remote = await fetchRemoteLayout(urls);
    const base = remote
      ? mergeLayoutWithData(remote, data)
      : createDefaultLayout(urls, data);
    setLayout({ ...base, sheetUrls: urls });
    if (remote) syncLayoutKeyToUrl(getLayoutKey(urls));
  }, []);

  const loadSheets = useCallback(
    async (urls: string[], merge = false, preserveScope = false) => {
      const unique = [...new Set(urls.filter(Boolean))];
      if (unique.length === 0) return;

      setLoading(true);
      setError(null);
      setLastUrl(unique[0]);
      setSheetUrls(unique);
      if (!preserveScope) {
        setFilters({});
        setDrillFilter(null);
      }
      setActiveTemplate(null);
      setFunnelMetrics(null);
      setShowLinkEditor(false);

      const scopeForApi =
        preserveScope && dataScope
          ? dataScope
          : getScopeFromUrl() ?? loadDataScope(unique);

      try {
        const res = await fetch("/api/sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: unique,
            merge: merge || unique.length > 1,
            join: unique.length === 2,
            dataScope: scopeForApi,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat data");

        setError(null);
        setSheetData(json);
        setSavedMetrics(loadSavedMetrics(unique));
        setFunnelMetrics(json.funnelMetrics ?? null);

        const urlScope = getScopeFromUrl();
        const savedScope = preserveScope ? dataScope : urlScope ?? loadDataScope(unique);
        if (savedScope && json.columns.some((c: { key: string }) => c.key === savedScope.columnKey)) {
          setDataScope(savedScope);
          if (urlScope) syncScopeToUrl(savedScope);
        } else if (!preserveScope) {
          setDataScope(null);
        }

        logAuditClient("sheet_load", `Loaded ${unique.length} sheet(s)`, { rows: json.rows?.length }, userRole);
        setActiveView("overview");
        setHeroCollapsed(true);
        persistSheetOnLoad(unique[0]);
        await initLayout(json, unique);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole, dataScope]
  );

  const loadSheet = useCallback(
    (url: string) => loadSheets([url], false),
    [loadSheets]
  );

  const loadFromDatabase = useCallback(
    async (data: SheetData & { sheetUrls?: string[] }) => {
      setLoading(true);
      setError(null);
      const urls =
        data.sheetUrls ??
        (data.dataset?.sourceUrl ? [data.dataset.sourceUrl] : ["postgresql://loaded"]);
      setLastUrl(urls[0]);
      setSheetUrls(urls);
      setFilters({});
      setDrillFilter(null);
      setActiveTemplate(null);
      setFunnelMetrics(null);
      setShowLinkEditor(false);
      setDataScope(null);

      try {
        setSheetData(data);
        setSavedMetrics([]);
        setFunnelMetrics(null);
        logAuditClient(
          "sheet_load",
          `DB: ${data.dataset?.name ?? "PostgreSQL"}`,
          { rows: data.rows?.length },
          userRole
        );
        setActiveView("overview");
        setHeroCollapsed(true);
        await initLayout(data, urls);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole]
  );

  const silentReload = useCallback(() => {
    const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
    if (urls.length) return loadSheets(urls, layout?.mergeMode ?? false, true);
  }, [sheetUrls, lastUrl, layout?.mergeMode, loadSheets]);

  const { lastRefreshAt, refreshing, runRefresh } = useAutoRefresh(
    Boolean(sheetData),
    autoRefreshMinutes,
    silentReload
  );

  const handleAutoRefreshChange = (minutes: AutoRefreshInterval) => {
    setAutoRefreshMinutes(minutes);
    saveAutoRefreshMinutes(minutes);
  };

  const handleReportScheduleChange = (minutes: ReportScheduleInterval) => {
    setReportScheduleMinutes(minutes);
    saveReportScheduleMinutes(minutes);
  };

  const handleCertifiedToggle = (enabled: boolean) => {
    setCertifiedMetricsOnly(enabled);
    saveCertifiedMetricsOnly(enabled);
  };

  const { flushSave } = useLayoutAutoSave(layout, Boolean(layout), setSyncStatus);

  const handleCopyLink = useCallback(async () => {
    await flushSave();
    const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
    const ok = await copyDashboardShareUrl(urls);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }, [sheetUrls, lastUrl, flushSave]);

  useEffect(() => {
    if (!auth.user || initRef.current) return;
    initRef.current = true;

    const boot = async () => {
      const fromParam = searchParams.get("sheet") || getSheetFromUrl();
      if (fromParam) {
        setLastUrl(fromParam);
        loadSheet(fromParam);
        return;
      }
      const saved = await fetchSavedSheets();
      const url = saved[0]?.url;
      if (url) {
        setLastUrl(url);
        loadSheet(url);
      }
    };
    void boot();
  }, [auth.user, searchParams, loadSheet]);

  const scopedBase = useMemo(() => {
    if (!sheetData) return null;
    if (!isScopeActive(dataScope)) return sheetData;
    const scopedRows = applyDataScope(sheetData.rows, dataScope);
    return reanalyze({ ...sheetData, rows: scopedRows }, {});
  }, [sheetData, dataScope]);

  const displayData = useMemo(() => {
    if (!scopedBase) return null;
    return reanalyze(scopedBase, filters);
  }, [scopedBase, filters]);

  const periodComparison = useMemo(() => {
    if (!displayData) return null;
    return computePeriodComparison(displayData.rows, displayData.columns);
  }, [displayData]);

  const enrichedDisplayData = useMemo(() => {
    if (!displayData) return null;
    const mergedMetrics = mergeMetricDefinitions(displayData.metrics ?? [], savedMetrics);
    const savedValues = computeSavedMetricValues(
      savedMetrics,
      displayData.rows,
      displayData.columns
    );
    return {
      ...displayData,
      metrics: mergedMetrics,
      metricValues: {
        totalRows: displayData.metricValues?.totalRows ?? displayData.rows.length,
        ...displayData.metricValues,
        dynamic: {
          ...displayData.metricValues?.dynamic,
          ...savedValues.dynamic,
        },
      },
    };
  }, [displayData, savedMetrics]);

  const viewData = enrichedDisplayData ?? displayData;

  const handleExportCsv = useCallback(() => {
    if (!viewData || !perms.canExport) return;
    const keys = viewData.columns.filter((c) => c.key.trim()).slice(0, 20).map((c) => c.key);
    const csv = buildCsvFromRows(viewData.rows, keys);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`sheetvision-${stamp}.csv`, csv);
    setLastExportAt(new Date());
    logAuditClient("export_csv", `Export ${viewData.rows.length} baris`, {}, userRole);
  }, [viewData, perms.canExport, userRole]);

  const totalRowCount = sheetData?.rows.length ?? 0;
  const scopedRowCount = scopedBase?.rows.length ?? 0;

  const dataAlerts = useMemo(() => {
    if (!sheetData || !displayData) return [];
    return computeDataAlerts(sheetData, displayData, filters, dataScope, scopedRowCount);
  }, [sheetData, displayData, filters, dataScope, scopedRowCount]);

  const activeScopeLabel = useMemo(
    () => (sheetData ? scopeLabel(dataScope, sheetData.columns) : null),
    [sheetData, dataScope]
  );

  const handleDataScopeChange = useCallback(
    (scope: DataScope | null) => {
      setDataScope(scope);
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      saveDataScope(urls, scope);
      syncScopeToUrl(scope);
      setFilters({});
      setDrillFilter(null);
      logAuditClient("scope_change", scope ? `${scope.columnKey}=${scope.values.join(",")}` : "cleared", {}, userRole);
    },
    [sheetUrls, lastUrl, userRole]
  );

  const handleSaveMetric = useCallback(
    (metric: SavedMetric) => {
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      setSavedMetrics(upsertSavedMetric(urls, metric));
      logAuditClient("metric_save", metric.name, { formula: metric.formula }, userRole);
    },
    [sheetUrls, lastUrl, userRole]
  );

  const handleCertifyMetric = useCallback(
    (id: string) => {
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      const updated = savedMetrics.map((m) =>
        m.id === id ? { ...m, status: "certified" as const } : m
      );
      const target = updated.find((m) => m.id === id);
      if (target) upsertSavedMetric(urls, target);
      setSavedMetrics(updated);
    },
    [savedMetrics, sheetUrls, lastUrl]
  );

  const handleRemoveMetric = useCallback(
    (id: string) => {
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      setSavedMetrics(removeSavedMetric(urls, id));
    },
    [sheetUrls, lastUrl]
  );

  const filterableColumns = useMemo(
    () => (scopedBase ? getFilterableColumns(scopedBase) : []),
    [scopedBase]
  );

  const distributionColumnKey = useMemo(() => {
    if (!viewData) return undefined;
    const statusCol = viewData.columns.find((c) => /status/i.test(c.key));
    const catCol = viewData.columns.find((c) => c.type === "category");
    return (statusCol ?? catCol)?.key;
  }, [viewData]);

  const handleDrillDown = useCallback((columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setDrillFilter({ column: columnKey, value });
  }, []);

  const handleApplyTemplate = useCallback(
    (templateId: LayoutTemplateId) => {
      if (!layout || !sheetData) return;
      const next = applyLayoutTemplate(templateId, layout, sheetData);
      setLayout(next);
      setActiveTemplate(templateId);
      void flushSave();
    },
    [layout, sheetData, flushSave]
  );

  const handleFiltersChange = useCallback((next: Filters) => {
    setFilters(next);
    if (drillFilter) {
      const stillActive = drillFilter.column in next && next[drillFilter.column] === drillFilter.value;
      if (!stillActive) setDrillFilter(null);
    }
  }, [drillFilter]);

  const applyChatActions = useCallback(
    (actions: DashboardAction[]) => {
      if (!sheetData) return;
      const columns = sheetData.columns;
      let needsReload = false;
      let nextUrls = sheetUrls;
      let nextMerge = layout?.mergeMode ?? false;

      for (const action of actions) {
        switch (action.type) {
          case "set_view":
            setActiveView(action.view);
            setMobileNav(false);
            break;
          case "set_filter": {
            const key = findColumnKey(action.column, columns);
            if (key && action.value) {
              setFilters((prev) => ({ ...prev, [key]: action.value }));
            }
            break;
          }
          case "set_filters": {
            const next: Filters = {};
            for (const [col, val] of Object.entries(action.filters)) {
              const key = findColumnKey(col, columns);
              if (key && val) next[key] = val;
            }
            setFilters((prev) => ({ ...prev, ...next }));
            break;
          }
          case "clear_filters":
            setFilters({});
            setDrillFilter(null);
            break;
          case "add_sheet":
            if (!nextUrls.includes(action.url)) {
              nextUrls = [...nextUrls, action.url];
              nextMerge = true;
              needsReload = true;
            }
            break;
          case "remove_sheet":
            nextUrls = nextUrls.filter((u) => u !== action.url);
            needsReload = nextUrls.length > 0;
            break;
          case "set_merge_mode":
            nextMerge = action.enabled;
            needsReload = nextUrls.length > 1;
            break;
          case "reset_layout":
            if (sheetData) {
              setLayout(createDefaultLayout(sheetUrls, sheetData));
            }
            break;
          default:
            break;
        }
      }

      if (layout) {
        const nextLayout = applyLayoutActions(layout, actions, columns);
        setLayout(nextLayout);
      }

      if (needsReload && nextUrls.length > 0) {
        loadSheets(nextUrls, nextMerge);
      }
    },
    [sheetData, sheetUrls, layout, loadSheets]
  );

  const renderView = () => {
    if (!viewData || !sheetData) return null;

    switch (activeView) {
      case "overview":
        if (!layout) return null;
        return (
          <div className="space-y-6">
            {periodComparison && (
              <PeriodComparisonPanel
                periodColumn={periodComparison.periodColumn}
                deltas={periodComparison.deltas}
              />
            )}
            <OverviewDashboard
              data={viewData}
            layout={layout}
            sheetUrls={sheetUrls}
            syncStatus={syncStatus}
            linkCopied={linkCopied}
            filters={filters}
            distributionColumnKey={distributionColumnKey}
            activeTemplate={activeTemplate}
            onDrillDown={handleDrillDown}
            onApplyTemplate={handleApplyTemplate}
            onBuilderOpenChange={setOverviewBuilderOpen}
            onSaveLayout={setLayout}
            onSaveNow={() => void flushSave()}
            onResetLayout={() => {
              if (sheetData) setLayout(createDefaultLayout(sheetUrls, sheetData));
            }}
            onCopyLink={() => void handleCopyLink()}
            onAddSheet={(url) => {
              const next = [...sheetUrls, url];
              setSheetUrls(next);
              setLayout((prev) =>
                prev
                  ? { ...prev, sheetUrls: next, mergeMode: true, updatedAt: new Date().toISOString() }
                  : prev
              );
            }}
            onRemoveSheet={(url) => {
              const next = sheetUrls.filter((u) => u !== url);
              setSheetUrls(next);
              if (next.length) loadSheets(next, layout?.mergeMode);
            }}
            onToggleMerge={(enabled) => {
              setLayout((prev) => (prev ? { ...prev, mergeMode: enabled } : prev));
              if (sheetUrls.length > 1) loadSheets(sheetUrls, enabled);
            }}
            onReloadMerged={() => loadSheets(sheetUrls, true)}
          />
          </div>
        );

      case "charts":
        return (
          <div className="space-y-6">
            <SectionHeader
              title="Galeri Grafik"
              description={`${viewData.charts.length} visualisasi · klik segmen untuk filter data`}
            />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {viewData.charts.map((chart, i) => (
                <ChartCard
                  key={chart.id}
                  chart={chart}
                  defaultLarge={i === 0}
                  className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
                  onDrillDown={(value) => handleDrillDown(chart.categoryKey, value)}
                />
              ))}
            </div>
            {viewData.charts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-16 text-center text-slate-500">
                Tidak ada grafik untuk data yang difilter.
              </div>
            )}
          </div>
        );

      case "insights":
        return (
          <div className="space-y-6">
            <InsightsPanel insights={viewData.insights} />
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusDistribution
                items={viewData.distributions}
                title="Breakdown Kategori"
                onDrillDown={
                  distributionColumnKey
                    ? (value) => handleDrillDown(distributionColumnKey, value)
                    : undefined
                }
                activeValue={distributionColumnKey ? filters[distributionColumnKey] : undefined}
              />
              <TopRecords records={viewData.topRecords} title="Ranking Tertinggi" />
            </div>
          </div>
        );

      case "data":
        return (
          <DataTable
            rows={viewData.rows}
            columns={viewData.columns}
            maskPII={perms.maskPII}
            canExport={perms.canExport}
            drillFilter={
              drillFilter
                ? {
                    column: drillFilter.column,
                    value: drillFilter.value,
                    columnLabel:
                      sheetData.columns.find((c) => c.key === drillFilter.column)?.label ??
                      drillFilter.column,
                  }
                : undefined
            }
          />
        );

      case "columns":
        return (
          <div className="space-y-6">
            {viewData.dataset && <DatasetCatalogPanel dataset={viewData.dataset} />}
            {viewData.metrics && viewData.metrics.length > 0 && (
              <MetricsLibraryPanel
                metrics={viewData.metrics}
                values={viewData.metricValues}
                savedMetrics={savedMetrics}
                canCertify={perms.canCertifyMetrics}
                onSaveMetric={handleSaveMetric}
                onCertifyMetric={handleCertifyMetric}
                onRemoveMetric={handleRemoveMetric}
              />
            )}
            {viewData.dataset?.quality && (
              <DataQualityPanel report={viewData.dataset.quality} />
            )}
            <MetricGlossaryPanel />
            <ColumnInsights columns={viewData.columns} />
          </div>
        );

      case "sources":
        return (
          <DataSourcePanel
            role={userRole}
            onLoadToDashboard={loadFromDatabase}
            onLoadingChange={setLoading}
          />
        );

      case "sql":
        return <SqlQueryPanel role={userRole} />;

      default:
        return null;
    }
  };

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <LoginPage
        configured={auth.configured}
        onLogin={auth.login}
        onRegister={auth.register}
      />
    );
  }

  return (
    <div className={cn("page-shell", sheetData && "page-shell--dashboard")}>
      {/* Landing hero — collapses when data loaded */}
      <section
        className={cn(
          "relative border-b border-slate-200/80 bg-white/60 backdrop-blur-sm transition-all duration-500",
          sheetData && heroCollapsed && !showLinkEditor ? "hidden" : "block"
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -right-32 top-10 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-12 sm:px-6">
          <div className="mb-8 text-center">
            <span className="badge badge-primary mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              SheetVision
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Ubah Google Sheet jadi{" "}
              <span className="text-indigo-600">Dashboard Interaktif</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">
              {showLinkEditor
                ? "Masukkan link baru atau pilih dari link tersimpan."
                : "Paste link, dapatkan multi-view dashboard. Link otomatis tersimpan di browser & URL."}
            </p>
          </div>

          <div className="flex justify-center">
            <LinkInput onSubmit={loadSheet} loading={loading} initialUrl={lastUrl} />
          </div>

          {sheetData && showLinkEditor && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowLinkEditor(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                ← Kembali ke dashboard
              </button>
            </div>
          )}

          {error && (
            <div className="mx-auto mt-4 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {!sheetData && (
            <div className="mt-6 flex justify-center">
              <SavedSheetsMenu
                currentUrl={lastUrl || undefined}
                onSelect={loadSheet}
                onChangeLink={() => {
                  document.getElementById("sheet-link-input")?.focus();
                }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Compact header when data loaded */}
      {sheetData && (
        <header className="layer-header sticky top-0 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 sm:flex">
                <span className="text-xs font-bold text-white">SV</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none text-slate-900">SheetVision</p>
                <p className="mt-1 truncate text-[11px] text-slate-500" title={lastUrl}>
                  {displayData?.rows.length ?? 0}
                  {isScopeActive(dataScope) && totalRowCount > 0
                    ? ` / ${scopedRowCount} scoped`
                    : ""}{" "}
                  baris
                  {lastUrl && ` · ${truncateUrl(lastUrl, 32)}`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <UserMenu user={auth.user} onLogout={() => void auth.logout()} />
              <SavedSheetsMenu
                currentUrl={lastUrl}
                onSelect={loadSheet}
                onChangeLink={() => {
                  setShowLinkEditor(true);
                  setHeroCollapsed(false);
                }}
              />
              <button
                onClick={() => loadSheet(lastUrl)}
                disabled={loading}
                className="btn-ghost disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <a
                href={sheetData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sheet</span>
              </a>
            </div>
          </div>
          {error && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-600 sm:px-6">
              {error}
            </div>
          )}
        </header>
      )}

      {loading && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSkeleton />
        </div>
      )}

      {sheetData && viewData && !loading && !showLinkEditor && (
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar
            active={activeView}
            onChange={setActiveView}
            rowCount={viewData.rows.length}
            scopeLabel={activeScopeLabel}
            role={userRole}
            footer={perms.canViewAudit ? <AuditLogPanel /> : undefined}
            className="hidden w-56 shrink-0 lg:flex"
          />

          {/* Mobile nav overlay */}
          {mobileNav && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                onClick={() => setMobileNav(false)}
              />
              <Sidebar
                active={activeView}
                onChange={(v) => {
                  setActiveView(v);
                  setMobileNav(false);
                }}
                rowCount={viewData.rows.length}
                scopeLabel={activeScopeLabel}
                role={userRole}
                className="absolute left-0 top-0 h-full w-64"
              />
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-100/50">
            <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-5 lg:p-6">
              <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm lg:hidden">
                {navItemsForRole(userRole).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      activeView === item.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AutoRefreshBar
                  intervalMinutes={autoRefreshMinutes}
                  onIntervalChange={handleAutoRefreshChange}
                  lastRefreshAt={lastRefreshAt}
                  refreshing={refreshing || loading}
                  onRefreshNow={() => void runRefresh()}
                />
                <ScheduledReportBar
                  intervalMinutes={reportScheduleMinutes}
                  onIntervalChange={handleReportScheduleChange}
                  onExport={handleExportCsv}
                  lastExportAt={lastExportAt}
                  canExport={perms.canExport}
                />
                <CertifiedMetricsToggle
                  enabled={certifiedMetricsOnly}
                  onChange={handleCertifiedToggle}
                />
              </div>

              {funnelMetrics && (
                <JoinFunnelBanner
                  joinConfig={funnelMetrics.joinConfig}
                  totalPengajuan={funnelMetrics.totalPengajuan}
                  approved={funnelMetrics.approved}
                  conversionRate={funnelMetrics.conversionRate}
                  joinedRowCount={funnelMetrics.joinedRowCount}
                />
              )}

              {sheetData && (
                <DataScopeBar
                  columns={sheetData.columns}
                  rows={scopedBase?.rows ?? sheetData.rows}
                  scope={dataScope}
                  totalRows={totalRowCount}
                  scopedRows={scopedRowCount}
                  onChange={handleDataScopeChange}
                />
              )}

              {dataAlerts.length > 0 && (
                <DataAlertsPanel
                  alerts={dataAlerts}
                  onRefresh={() => loadSheet(lastUrl)}
                />
              )}

              {(filterableColumns.length > 0 || drillFilter) && activeView !== "columns" && (
                <div className="space-y-2">
                  {drillFilter && (
                    <DrillThroughBanner
                      columnLabel={
                        sheetData.columns.find((c) => c.key === drillFilter.column)?.label ??
                        drillFilter.column
                      }
                      value={drillFilter.value}
                      rowCount={viewData.rows.length}
                      onViewData={() => setActiveView("data")}
                      onClear={() => {
                        setFilters((prev) => {
                          const next = { ...prev };
                          delete next[drillFilter.column];
                          return next;
                        });
                        setDrillFilter(null);
                      }}
                    />
                  )}
                  {filterableColumns.length > 0 && (
                    <FilterBar
                      columns={filterableColumns}
                      filters={filters}
                      onChange={handleFiltersChange}
                      rows={scopedBase?.rows ?? sheetData.rows}
                      totalRows={scopedRowCount}
                    />
                  )}
                </div>
              )}

              <div key={`${activeView}-${JSON.stringify(filters)}`} className="animate-fade-in">
                {renderView()}
              </div>
            </div>
          </main>

          {viewData && layout && !overviewBuilderOpen && (
            <FloatingChatWidget
              data={viewData}
              activeView={activeView}
              filters={filters}
              dataScope={dataScope}
              totalRowCount={totalRowCount}
              userRole={userRole}
              certifiedMetricsOnly={certifiedMetricsOnly}
              layout={layout}
              sheetUrls={sheetUrls}
              onApplyActions={applyChatActions}
            />
          )}
        </div>
      )}

      {!sheetData && !loading && !error && <LandingFeatures />}
    </div>
  );
}
