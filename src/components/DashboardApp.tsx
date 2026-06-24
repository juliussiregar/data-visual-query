"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import type { SheetData, ViewId, DashboardLayout, DashboardAction, DataScope, WidgetProposal, WidgetProposalConfirmResult } from "@/lib/types";
import { applyWidgetProposal, cloneLayout } from "@/lib/widget-proposal";
import { reanalyze, type Filters } from "@/lib/filters";
import { computeDataAlerts } from "@/lib/alerts";
import { findColumnKey, applyLayoutActions } from "@/lib/chat-actions";
import { DataViewPanel } from "./DataViewPanel";
import { ActiveFiltersBar } from "./ActiveFiltersBar";
import { useToast } from "./ToastProvider";
import { FloatingChatWidget } from "./FloatingChatWidget";
import { Sidebar } from "./Sidebar";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { SheetManagerMenu } from "./SheetManagerMenu";
import { InsightsPanel } from "./InsightsPanel";
import { UserMenu } from "./UserMenu";
import { LoginPage } from "./LoginPage";
import { DataSourcePanel } from "./DataSourcePanel";
import { VisualQueryPanel, VisualQueryEmptyState } from "./VisualQueryPanel";
import {
  EMPTY_VISUAL_QUERY,
  applyVisualQuery,
  isVisualQueryActive,
  type VisualQuery,
} from "@/lib/visual-query";
import { AuditLogPanel } from "./AuditLogPanel";
import { JoinFunnelBanner } from "./JoinFunnelBanner";
import { AutoRefreshBar } from "./AutoRefreshBar";
import { MetricGlossaryPanel } from "./MetricGlossaryPanel";
import { ScheduledReportBar } from "./ScheduledReportBar";
import { truncateUrl } from "@/lib/sheet-storage";
import { OverviewDashboard } from "./OverviewDashboard";
import { ChartsGallery } from "./ChartsGallery";
import {
  createDefaultLayout,
  mergeLayoutWithData,
  stripLegacyStarterPack,
} from "@/lib/layout";
import { DataAlertsPanel } from "./DataAlertsPanel";
import {
  fetchRemoteLayout,
  getLayoutKey,
  syncLayoutKeyToUrl,
  copyDashboardShareUrl,
} from "@/lib/layout-storage";
import { useLayoutAutoSave, type LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
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
import { fetchDbConnections, connectionToApiPayload } from "@/lib/datasource-storage";
import type { Project } from "@/lib/project-types";
import {
  fetchProject,
  fetchProjects,
  getProjectFromUrl,
  syncProjectToUrl,
  updateProject,
} from "@/lib/project-storage";
import { clearWorkspaceLocalStorage } from "@/lib/workspace-storage";
import {
  probeDatabaseTable,
  probeSheetUrl,
  projectSourceType,
} from "@/lib/project-source-probe";
import { AppDialog } from "./AppDialog";
import { ProjectSelector } from "./ProjectSelector";
import { ProjectCreateWizard } from "./ProjectCreateWizard";
import { ProjectSettingsDialogContent } from "./ProjectSettingsDialogContent";
import { WelcomeView } from "./WelcomeView";
import { ViewPageShell } from "./ViewPageShell";
import { flatNavItemsForRole, MOBILE_PRIMARY_VIEWS, navItemsForRole } from "@/lib/nav-config";
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
  const [mobileNav, setMobileNav] = useState(false);
  const [overviewBuilderOpen, setOverviewBuilderOpen] = useState(false);
  const [drillFilter, setDrillFilter] = useState<{ column: string; value: string } | null>(null);
  const [dataScope, setDataScope] = useState<DataScope | null>(null);
  const [savedMetrics, setSavedMetrics] = useState<SavedMetric[]>([]);
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics | null>(null);
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<AutoRefreshInterval>(0);
  const [reportScheduleMinutes, setReportScheduleMinutes] =
    useState<ReportScheduleInterval>(0);
  const [lastExportAt, setLastExportAt] = useState<Date | null>(null);
  const [visualQuery, setVisualQuery] = useState<VisualQuery>(EMPTY_VISUAL_QUERY);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const activeProjectRef = useRef<Project | null>(null);
  activeProjectRef.current = activeProject;

  const userRole = auth.user?.role ?? "analyst";
  const perms = rolePermissions(userRole);
  const { toast } = useToast();

  useEffect(() => {
    setAutoRefreshMinutes(loadAutoRefreshMinutes());
    setReportScheduleMinutes(loadReportScheduleMinutes());
  }, []);

  useEffect(() => {
    if (activeView !== "overview") {
      setOverviewBuilderOpen(false);
    }
  }, [activeView]);


  const initLayout = useCallback(
    async (data: SheetData, urls: string[], projectLayout?: DashboardLayout | null) => {
      let base: DashboardLayout;
      if (projectLayout) {
        base = stripLegacyStarterPack(mergeLayoutWithData(projectLayout, data));
      } else {
        const remote = await fetchRemoteLayout(urls);
        base = remote
          ? stripLegacyStarterPack(mergeLayoutWithData(remote, data))
          : createDefaultLayout(urls);
        if (remote) syncLayoutKeyToUrl(getLayoutKey(urls));
      }
      setLayout({ ...base, sheetUrls: urls });
    },
    []
  );

  const loadSheets = useCallback(
    async (
      urls: string[],
      merge = false,
      preserveScope = false,
      projectLayout?: DashboardLayout | null
    ) => {
      const unique = [...new Set(urls.filter(Boolean))];
      if (unique.length === 0) return;

      setLoading(true);
      setError(null);
      setLastUrl(unique[0]);
      setSheetUrls(unique);
      if (!preserveScope) {
        setFilters({});
        setDrillFilter(null);
        setVisualQuery(EMPTY_VISUAL_QUERY);
      }
      setFunnelMetrics(null);
      const scopeForApi = undefined;

      try {
        const res = await fetch("/api/sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: unique,
            merge: merge || unique.length > 1,
            join: unique.length === 2 && !merge,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal memuat data");

        setError(null);
        setSheetData(json);
        setSavedMetrics(loadSavedMetrics(unique));
        setFunnelMetrics(json.funnelMetrics ?? null);

        setDataScope(null);

        logAuditClient("sheet_load", `Loaded ${unique.length} sheet(s)`, { rows: json.rows?.length }, userRole);
        setActiveView("overview");
        setHeroCollapsed(true);
        await initLayout(
          json,
          unique,
          projectLayout ?? activeProjectRef.current?.layout ?? undefined
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole]
  );

  const loadSheet = useCallback(
    (url: string) => loadSheets([url], false),
    [loadSheets]
  );

  const refreshProjects = useCallback(async () => {
    const list = await fetchProjects();
    setProjects(list);
    if (activeProjectRef.current) {
      const fresh = list.find((p) => p.id === activeProjectRef.current?.id);
      if (fresh) setActiveProject(fresh);
    }
    return list;
  }, []);

  const openProject = useCallback((project: Project) => {
    setActiveProject(project);
    syncProjectToUrl(project.id);
    setSheetUrls(project.sheetUrls);
    if (project.sheetUrls[0]) setLastUrl(project.sheetUrls[0]);
  }, []);

  const loadProjectSheets = useCallback(
    (project: Project) => {
      openProject(project);
      if (project.sheetUrls.length > 0) {
        void loadSheets(
          project.sheetUrls,
          project.mergeMode,
          false,
          project.layout ?? undefined
        );
        setActiveView("overview");
      } else {
        setActiveView("overview");
      }
      setHeroCollapsed(true);
    },
    [loadSheets, openProject]
  );

  const handleSelectProject = useCallback(
    (project: Project) => {
      setSheetData(null);
      setLayout(null);
      setFilters({});
      openProject(project);
      setActiveView("overview");
    },
    [openProject]
  );

  const handleNewProject = useCallback(() => {
    setShowCreateDialog(true);
  }, []);

  const handleResetWorkspace = useCallback(async () => {
    if (
      !confirm(
        "Reset semua data workspace?\n\nProject, sheet tersimpan, layout dashboard, dan koneksi DB akan dihapus. Akun login tetap ada."
      )
    ) {
      return;
    }

    const res = await fetch("/api/user/reset-workspace", { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Gagal mereset data");
      return;
    }

    clearWorkspaceLocalStorage();
    setSheetData(null);
    setLoading(false);
    setError(null);
    setActiveView("overview");
    setFilters({});
    setLastUrl("");
    setSheetUrls([]);
    setLayout(null);
    setLinkCopied(false);
    setHeroCollapsed(true);
    setOverviewBuilderOpen(false);
    setDrillFilter(null);
    setDataScope(null);
    setSavedMetrics([]);
    setFunnelMetrics(null);
    setVisualQuery(EMPTY_VISUAL_QUERY);
    setActiveProject(null);
    setProjects([]);
    initRef.current = false;
    window.location.reload();
  }, []);

  const handleSwitchSheet = useCallback(
    (url: string) => loadSheets([url], false),
    [loadSheets]
  );

  const handleAddSheetToMerge = useCallback(
    (url: string) => {
      const next = [...new Set([...sheetUrls, url])];
      void loadSheets(next, true);
    },
    [sheetUrls, loadSheets]
  );

  const handleRemoveSheetFromMerge = useCallback(
    (url: string) => {
      const next = sheetUrls.filter((u) => u !== url);
      if (!next.length) return;
      void loadSheets(next, next.length > 1 && (layout?.mergeMode ?? true));
    },
    [sheetUrls, layout?.mergeMode, loadSheets]
  );

  const handleToggleMergeMode = useCallback(
    (enabled: boolean) => {
      setLayout((prev) =>
        prev ? { ...prev, mergeMode: enabled, updatedAt: new Date().toISOString() } : prev
      );
      if (sheetUrls.length > 1) void loadSheets(sheetUrls, enabled);
    },
    [sheetUrls, loadSheets]
  );

  const handleReloadMerged = useCallback(
    () => void loadSheets(sheetUrls, layout?.mergeMode ?? sheetUrls.length > 1),
    [sheetUrls, layout?.mergeMode, loadSheets]
  );

  const joinModeActive = Boolean((sheetData as { joinMode?: boolean } | null)?.joinMode);

  const loadFromDatabase = useCallback(
    async (
      data: SheetData & { sheetUrls?: string[] },
      projectLayout?: DashboardLayout | null
    ) => {
      setLoading(true);
      setError(null);
      const urls =
        data.sheetUrls ??
        (data.dataset?.sourceUrl ? [data.dataset.sourceUrl] : ["postgresql://loaded"]);
      setLastUrl(urls[0]);
      setSheetUrls(urls);
      setFilters({});
      setDrillFilter(null);
      setVisualQuery(EMPTY_VISUAL_QUERY);
      setFunnelMetrics(null);
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
        await initLayout(data, urls, projectLayout);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole]
  );

  const loadProject = useCallback(
    async (project: Project) => {
      openProject(project);
      if (project.sheetUrls.length > 0) {
        loadProjectSheets(project);
        return;
      }

      if (project.activeDbConnectionId && project.activeDbTable?.trim()) {
        setError(null);
        try {
          const connections = await fetchDbConnections();
          const conn = connections.find((c) => c.id === project.activeDbConnectionId);
          if (!conn) {
            throw new Error("Koneksi database tidak ditemukan. Tambahkan di tab Sumber.");
          }
          const res = await fetch("/api/datasource/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...connectionToApiPayload(conn, { table: project.activeDbTable!.trim() }),
              connectionName: conn.name,
              table: project.activeDbTable!.trim(),
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Gagal memuat tabel");
          await loadFromDatabase(data, project.layout ?? undefined);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal memuat database");
          setActiveView("overview");
        }
        return;
      }

      setActiveView("overview");
    },
    [loadProjectSheets, loadFromDatabase, openProject]
  );

  const handleLoadActiveProject = useCallback(() => {
    if (!activeProject) return;
    void loadProject(activeProject);
  }, [activeProject, loadProject]);

  const handleVerifyAndLoad = useCallback(async () => {
    if (!activeProject) return;
    const sourceType = projectSourceType(activeProject);
    if (!sourceType) {
      setShowSettingsDialog(true);
      return;
    }

    setLoadingMessage("Memeriksa koneksi…");
    setError(null);

    let ok = false;
    if (sourceType === "sheet") {
      const result = await probeSheetUrl(activeProject.sheetUrls[0]);
      ok = result.ok;
      if (!result.ok) setError(result.error);
    } else {
      const connections = await fetchDbConnections();
      const conn = connections.find((c) => c.id === activeProject.activeDbConnectionId);
      if (!conn) {
        setError("Koneksi database tidak ditemukan");
      } else {
        const result = await probeDatabaseTable(conn, activeProject.activeDbTable ?? "");
        ok = result.ok;
        if (!result.ok) setError(result.error);
      }
    }

    if (!ok) {
      setLoadingMessage(null);
      return;
    }

    setLoadingMessage("Memuat data…");
    await loadProject(activeProject);
    setLoadingMessage(null);
  }, [activeProject, loadProject]);

  const handleProjectCreated = useCallback(
    (project: Project) => {
      setProjects((prev) => [project, ...prev]);
      setActiveProject(project);
      syncProjectToUrl(project.id);
      setShowCreateDialog(false);
      setActiveView("overview");
      setLoadingMessage("Memuat data…");
      void loadProject(project).finally(() => setLoadingMessage(null));
      void refreshProjects();
    },
    [loadProject, refreshProjects]
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

  const { flushSave } = useLayoutAutoSave(
    layout,
    Boolean(layout),
    setSyncStatus,
    activeProject?.id
  );

  const handleCopyLink = useCallback(async () => {
    await flushSave();
    const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
    const ok = await copyDashboardShareUrl(urls);
    if (ok) {
      setLinkCopied(true);
      toast("Dashboard link copied");
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }, [sheetUrls, lastUrl, flushSave, toast]);

  useEffect(() => {
    if (!auth.user || initRef.current) return;
    initRef.current = true;

    const boot = async () => {
      const list = await refreshProjects();

      const projectId = searchParams.get("project") || getProjectFromUrl();
      if (projectId) {
        const project = list.find((p) => p.id === projectId) ?? (await fetchProject(projectId));
        if (project) {
          openProject(project);
          setActiveView("overview");
          setHeroCollapsed(true);
          return;
        }
      }

      setActiveView("overview");
      setHeroCollapsed(true);
      if (list.length === 0) {
        setShowCreateDialog(true);
      } else {
        openProject(list[0]);
      }
    };
    void boot();
  }, [auth.user, searchParams, openProject, refreshProjects]);

  const scopedBase = sheetData;

  const queryFilteredBase = useMemo(() => {
    if (!scopedBase) return null;
    if (!isVisualQueryActive(visualQuery)) return scopedBase;
    const rows = applyVisualQuery(scopedBase.rows, visualQuery, scopedBase.columns);
    return reanalyze({ ...scopedBase, rows }, {});
  }, [scopedBase, visualQuery]);

  const displayData = useMemo(() => {
    if (!queryFilteredBase) return null;
    return reanalyze(queryFilteredBase, filters);
  }, [queryFilteredBase, filters]);

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

  const removeFilter = useCallback(
    (columnKey: string) => {
      setFilters((prev) => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      setDrillFilter((prev) => (prev?.column === columnKey ? null : prev));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setDrillFilter(null);
    toast("All filters cleared");
  }, [toast]);

  const handleExportCsv = useCallback(() => {
    if (!viewData || !perms.canExport) return;
    const keys = viewData.columns.filter((c) => c.key.trim()).slice(0, 20).map((c) => c.key);
    const csv = buildCsvFromRows(viewData.rows, keys);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`sheetvision-${stamp}.csv`, csv);
    setLastExportAt(new Date());
    logAuditClient("export_csv", `Export ${viewData.rows.length} baris`, {}, userRole);
    toast("CSV exported");
  }, [viewData, perms.canExport, userRole, toast]);

  const totalRowCount = sheetData?.rows.length ?? 0;
  const scopedRowCount = scopedBase?.rows.length ?? 0;

  const dataAlerts = useMemo(() => {
    if (!sheetData || !displayData) return [];
    return computeDataAlerts(sheetData, displayData, filters, null, scopedRowCount);
  }, [sheetData, displayData, filters, scopedRowCount]);

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
              setLayout(createDefaultLayout(sheetUrls));
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

  const handleConfirmWidgetProposal = useCallback(
    (proposal: WidgetProposal): WidgetProposalConfirmResult => {
      if (!layout || !perms.canEditLayout) return { ok: false };
      const dataForWidget = viewData ?? sheetData;
      if (!dataForWidget) return { ok: false };

      const snapshot = cloneLayout(layout);
      const { layout: next, error } = applyWidgetProposal(layout, dataForWidget, proposal);
      if (error) {
        toast(error);
        return { ok: false };
      }

      setLayout(next);
      void flushSave();
      setActiveView("overview");
      setMobileNav(false);
      logAuditClient(
        "layout_change",
        `AI widget: ${proposal.summary}`,
        { operation: proposal.operation },
        userRole
      );
      toast(
        proposal.operation === "delete"
          ? "Widget dihapus"
          : proposal.operation === "update"
            ? "Widget diperbarui"
            : "Widget ditambahkan ke Overview"
      );
      return { ok: true, layoutSnapshot: snapshot };
    },
    [layout, perms.canEditLayout, viewData, sheetData, flushSave, userRole, toast]
  );

  const handleUndoWidgetLayout = useCallback(
    (snapshot: DashboardLayout) => {
      if (!perms.canEditLayout) return;
      setLayout(snapshot);
      void flushSave();
      logAuditClient("layout_change", "Undo perubahan widget AI", {}, userRole);
      toast("Perubahan widget dibatalkan");
    },
    [perms.canEditLayout, flushSave, userRole, toast]
  );

  const renderWelcome = () => (
    <WelcomeView
      project={activeProject}
      loading={Boolean(loadingMessage || (loading && !sheetData))}
      loadingMessage={loadingMessage ?? undefined}
      onCreateProject={() => setShowCreateDialog(true)}
      onOpenSettings={() => setShowSettingsDialog(true)}
      onVerifyAndLoad={() => void handleVerifyAndLoad()}
    />
  );

  const renderView = () => {
    if (activeView === "audit") {
      if (!perms.canViewAudit) {
        return (
          <ViewPageShell title="Audit Log" description="Akses dibatasi untuk admin.">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-800">
              Anda tidak memiliki izin melihat audit log.
            </div>
          </ViewPageShell>
        );
      }
      return <AuditLogPanel />;
    }

    if (activeView === "sources") {
      return (
        <div className="space-y-4">
          <DataSourcePanel
            role={userRole}
            onLoadToDashboard={loadFromDatabase}
            onLoadingChange={setLoading}
          />
          <MetricGlossaryPanel />
        </div>
      );
    }

    if (!viewData || !sheetData) {
      return renderWelcome();
    }

    switch (activeView) {
      case "overview":
        if (!layout) return null;
        return (
          <OverviewDashboard
            data={sheetData}
            layout={layout}
            sheetUrls={sheetUrls}
            syncStatus={syncStatus}
            linkCopied={linkCopied}
            onBuilderOpenChange={setOverviewBuilderOpen}
            onSaveLayout={setLayout}
            onSaveNow={() => void flushSave()}
            onResetLayout={() => {
              if (sheetData) {
                const next = createDefaultLayout(sheetUrls);
                setLayout(next);
                if (activeProject) {
                  void updateProject(activeProject.id, { layout: next });
                  setActiveProject({ ...activeProject, layout: next });
                }
              }
            }}
            onCopyLink={() => void handleCopyLink()}
            onAddSheet={handleAddSheetToMerge}
            onRemoveSheet={handleRemoveSheetFromMerge}
            onToggleMerge={handleToggleMergeMode}
            onReloadMerged={handleReloadMerged}
          />
        );

      case "charts":
        return (
          <ChartsGallery
            data={sheetData}
            onDrillDown={(column, value) => {
              setFilters((prev) => ({ ...prev, [column]: value }));
              setDrillFilter({ column, value });
              setActiveView("data");
              toast(`Filter applied: ${value}`, "info");
            }}
            onGoOverview={() => setActiveView("overview")}
          />
        );

      case "data":
      case "columns":
        return (
          <DataViewPanel
            sheetData={viewData}
            maskPII={perms.maskPII}
            canExport={perms.canExport}
            savedMetrics={savedMetrics}
            canCertifyMetrics={perms.canCertifyMetrics}
            onSaveMetric={handleSaveMetric}
            onCertifyMetric={handleCertifyMetric}
            onRemoveMetric={handleRemoveMetric}
          />
        );

      case "insights":
        return (
          <ViewPageShell title="Insight" description="Ringkasan temuan otomatis dari data">
            <InsightsPanel insights={viewData.insights} />
          </ViewPageShell>
        );

      case "query":
        if (!scopedBase) return renderWelcome();
        return (
          <ViewPageShell
            title="Cari Data"
            description="Susun filter visual tanpa menulis kode"
          >
            <VisualQueryPanel
              data={scopedBase}
              query={visualQuery}
              onChange={setVisualQuery}
              onApplyToDashboard={() => setActiveView("overview")}
              onClear={() => setVisualQuery(EMPTY_VISUAL_QUERY)}
              maskPII={perms.maskPII}
              canExport={perms.canExport}
            />
          </ViewPageShell>
        );

      case "projects":
        return renderWelcome();

      default:
        return null;
    }
  };

  const inDataDashboard = Boolean(sheetData && viewData);
  const showFiltersBar =
    inDataDashboard &&
    ["overview", "charts", "data", "query"].includes(activeView) &&
    Object.values(filters).some((v) => v.trim());
  const showAppShell = Boolean(auth.user);

  if (auth.loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p className="text-sm text-slate-500">Memuat sesi…</p>
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
      {showAppShell && (
        <header className="layer-header sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 sm:flex">
                <span className="text-xs font-bold text-white">SV</span>
              </div>
              <ProjectSelector
                projects={projects}
                activeProject={activeProject}
                onSelect={(p) => handleSelectProject(p)}
                onCreate={handleNewProject}
                onSettings={() => setShowSettingsDialog(true)}
              />
              {inDataDashboard && (
                <p className="hidden truncate text-[11px] text-slate-500 md:block">
                  {displayData?.rows.length.toLocaleString("id-ID")} baris
                  {sheetData?.dataset?.name ? ` · ${sheetData.dataset.name}` : ""}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <UserMenu
                user={auth.user}
                onLogout={() => void auth.logout()}
                onOpenSettings={() => setShowSettingsDialog(true)}
                onResetWorkspace={() => void handleResetWorkspace()}
              />
              {sheetData && (
                <>
                  <SheetManagerMenu
                    sheetUrls={sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : []}
                    projectSheetUrls={activeProject?.sheetUrls ?? sheetUrls}
                    projectId={activeProject?.id ?? null}
                    sheetLabels={(sheetData as { sheetLabels?: Record<string, string> } | null)?.sheetLabels}
                    mergeMode={layout?.mergeMode ?? sheetUrls.length > 1}
                    joinMode={joinModeActive}
                    loading={loading}
                    onSwitchSheet={handleSwitchSheet}
                    onAddSheet={handleAddSheetToMerge}
                    onRemoveSheet={handleRemoveSheetFromMerge}
                    onToggleMerge={handleToggleMergeMode}
                    onReload={handleReloadMerged}
                    onOpenSettings={() => setShowSettingsDialog(true)}
                  />
                  <button
                    onClick={() =>
                      void loadSheets(
                        sheetUrls.length ? sheetUrls : [lastUrl],
                        layout?.mergeMode ?? sheetUrls.length > 1,
                        true
                      )
                    }
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
                </>
              )}
            </div>
          </div>
          {error && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-600 sm:px-6">
              {error}
            </div>
          )}
        </header>
      )}

      {loading && sheetData && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <LoadingSkeleton />
        </div>
      )}

      {showAppShell && (
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar
            active={activeView}
            onChange={setActiveView}
            hasData={inDataDashboard}
            rowCount={viewData?.rows.length ?? 0}
            scopeLabel={null}
            role={userRole}
            className="hidden w-[220px] shrink-0 lg:flex"
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
                hasData={inDataDashboard}
                rowCount={viewData?.rows.length ?? 0}
                scopeLabel={null}
                role={userRole}
                className="absolute left-0 top-0 h-full w-[260px]"
              />
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-100/50">
            <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-5 lg:p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm lg:hidden">
                {flatNavItemsForRole(userRole)
                  .filter((item) => MOBILE_PRIMARY_VIEWS.includes(item.id))
                  .map((item) => {
                  const locked = Boolean(item.requiresData && !inDataDashboard);
                  return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(locked ? "overview" : item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      activeView === item.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : locked
                          ? "text-slate-400"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                  );
                })}
              </div>

              {inDataDashboard && (
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
                </div>
              )}

              {inDataDashboard && funnelMetrics && (
                <JoinFunnelBanner
                  joinConfig={funnelMetrics.joinConfig}
                  totalPengajuan={funnelMetrics.totalPengajuan}
                  approved={funnelMetrics.approved}
                  conversionRate={funnelMetrics.conversionRate}
                  joinedRowCount={funnelMetrics.joinedRowCount}
                />
              )}

              {inDataDashboard && dataAlerts.length > 0 && (
                <DataAlertsPanel
                  alerts={dataAlerts}
                  onRefresh={() => loadSheet(lastUrl)}
                />
              )}

              {showFiltersBar && sheetData && viewData && (
                <ActiveFiltersBar
                  filters={filters}
                  columns={sheetData.columns}
                  rowCount={viewData.rows.length}
                  onRemove={removeFilter}
                  onClearAll={clearAllFilters}
                />
              )}

              <div key={activeView} className="animate-fade-in">
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
              layout={layout}
              sheetUrls={sheetUrls}
              onApplyActions={applyChatActions}
              onConfirmWidgetProposal={handleConfirmWidgetProposal}
              onUndoWidgetLayout={handleUndoWidgetLayout}
            />
          )}
        </div>
      )}

      <AppDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Project baru"
        description="Nama, sumber data, lalu kami cek koneksi otomatis"
        size="lg"
      >
        <ProjectCreateWizard
          compact
          onCreated={handleProjectCreated}
          onCancel={() => setShowCreateDialog(false)}
        />
      </AppDialog>

      {activeProject && (
        <AppDialog
          open={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          title="Atur sumber data"
          description={activeProject.name}
          size="lg"
        >
          <ProjectSettingsDialogContent
            project={activeProject}
            onUpdated={(p) => {
              setActiveProject(p);
              setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            }}
            onLoad={() => {
              setShowSettingsDialog(false);
              void handleVerifyAndLoad();
            }}
            loading={loading}
          />
        </AppDialog>
      )}

    </div>
  );
}
