"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import type { SheetData, ViewId, DashboardLayout, DashboardAction, DataScope, WidgetProposal, WidgetProposalConfirmResult, WidgetProposalsConfirmResult } from "@/lib/types";
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
import { QueryEditorPanel } from "./QueryEditorPanel";
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
import { sheetDataWithDerivedFields, validateNewDerivedField, type DerivedField } from "@/lib/derived-fields";
import { createQueryDashboardWidgets, type QueryDashboardAddMode } from "@/lib/query-widget";
import type { VisualSqlResult } from "@/lib/visual-sql";
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
import { formatDatasetLabel, isRelationExecutable } from "@/lib/table-relations";
import { formatDbTableLabel } from "@/lib/data-source-labels";
import { DbTableSelect } from "./DbTableSelect";
import { resolveProjectDbTables } from "@/lib/db-table-datasets";
import type { Project } from "@/lib/project-types";
import {
  fetchProjects,
  fetchProject,
  getProjectFromUrl,
  syncProjectToUrl,
  updateProject,
} from "@/lib/project-storage";
import { getViewFromUrl, syncViewToUrl } from "@/lib/view-url";
import { clearWorkspaceLocalStorage } from "@/lib/workspace-storage";
import {
  clearLegacyLocalStorage,
  clearUserLocalStorage,
  setActiveUserId,
} from "@/lib/user-local-storage";
import {
  projectSourceType,
  projectHasSource,
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
  const prevUserIdRef = useRef<string | null>(null);
  const auth = useAuth();

  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [dbDatasets, setDbDatasets] = useState<Record<string, SheetData> | null>(null);
  const [activeDbTables, setActiveDbTables] = useState<string[]>([]);
  const [selectedDataTable, setSelectedDataTable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>(() => getViewFromUrl() ?? "overview");
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
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const activeProjectRef = useRef<Project | null>(null);
  activeProjectRef.current = activeProject;
  const layoutRef = useRef<DashboardLayout | null>(null);
  layoutRef.current = layout;
  const selectedDataTableRef = useRef("");
  selectedDataTableRef.current = selectedDataTable;

  const resolveLayoutForReload = useCallback(
    (project?: Project | null): DashboardLayout | null | undefined => {
      if (project) {
        if (project.layout) return project.layout;
        if (project.id === activeProjectRef.current?.id && layoutRef.current) {
          return layoutRef.current;
        }
        return null;
      }
      const current = activeProjectRef.current;
      if (!current) return undefined;
      if (layoutRef.current) return layoutRef.current;
      return current.layout ?? null;
    },
    []
  );

  const userRole = auth.user?.role ?? "analyst";
  const userId = auth.user?.id ?? "";
  const perms = rolePermissions(userRole);
  const { toast } = useToast();

  useEffect(() => {
    syncViewToUrl(activeView);
  }, [activeView]);

  const resetDashboardState = useCallback(() => {
    setSheetData(null);
    setDbDatasets(null);
    setActiveDbTables([]);
    setSelectedDataTable("");
    setLoading(false);
    setError(null);
    setActiveView("overview");
    setFilters({});
    setLastUrl("");
    setSheetUrls([]);
    layoutRef.current = null;
    setLayout(null);
    setSyncStatus("synced");
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
    setLoadingMessage(null);
    syncProjectToUrl(null);
    syncViewToUrl("overview");
  }, []);

  useEffect(() => {
    const nextUserId = auth.user?.id ?? null;
    if (nextUserId === prevUserIdRef.current) return;

    const previousUserId = prevUserIdRef.current;
    prevUserIdRef.current = nextUserId;

    if (previousUserId) {
      clearUserLocalStorage(previousUserId);
      clearLegacyLocalStorage();
      resetDashboardState();
      initRef.current = false;
    }

    if (nextUserId) {
      setActiveUserId(nextUserId);
      setAutoRefreshMinutes(loadAutoRefreshMinutes(nextUserId));
      setReportScheduleMinutes(loadReportScheduleMinutes(nextUserId));
    }
  }, [auth.user?.id, resetDashboardState]);

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
      } else if (projectLayout === null) {
        base = createDefaultLayout(urls);
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
        if (userId) setSavedMetrics(loadSavedMetrics(userId, unique));
        setFunnelMetrics(json.funnelMetrics ?? null);

        setDataScope(null);

        logAuditClient("sheet_load", `Loaded ${unique.length} sheet(s)`, { rows: json.rows?.length }, userRole);
        setHeroCollapsed(true);
        await initLayout(
          json,
          unique,
          projectLayout ?? resolveLayoutForReload(activeProjectRef.current)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole, userId, resolveLayoutForReload]
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
      else setActiveProject(null);
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
          resolveLayoutForReload(project)
        );
      }
      setHeroCollapsed(true);
    },
    [loadSheets, openProject, resolveLayoutForReload]
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

    clearWorkspaceLocalStorage(auth.user?.id);
    resetDashboardState();
    initRef.current = false;
    window.location.reload();
  }, [auth.user?.id, resetDashboardState]);

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

  const fetchDatabaseProjectData = useCallback(async (project: Project) => {
    const connections = await fetchDbConnections();
    const conn = connections.find((c) => c.id === project.activeDbConnectionId);
    if (!conn) {
      throw new Error("Koneksi database tidak ditemukan. Tambahkan di tab Sumber.");
    }
    const tables = resolveProjectDbTables(project);
    const payload = connectionToApiPayload(conn);
    const endpoint =
      tables.length === 1 ? "/api/datasource/load" : "/api/datasource/load-tables";
    const body =
      tables.length === 1
        ? {
            ...payload,
            connectionName: conn.name,
            table: tables[0],
          }
        : {
            ...payload,
            connectionName: conn.name,
            tables,
          };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const loaded = await res.json();
    if (!res.ok) throw new Error(loaded.error || "Gagal memuat tabel");

    const relations = (project.tableRelations ?? []).filter(isRelationExecutable);
    if (relations.length > 0) {
      const joinRes = await fetch("/api/datasource/load-joins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ...payload,
          connectionName: conn.name,
          relations,
        }),
      });
      const joinLoaded = await joinRes.json();
      if (!joinRes.ok) throw new Error(joinLoaded.error || "Gagal memuat join");
      loaded.datasets = { ...(loaded.datasets ?? {}), ...(joinLoaded.datasets ?? {}) };
      const joinAliases = (joinLoaded.relations as string[]) ?? [];
      loaded.tables = [...(loaded.tables ?? tables), ...joinAliases];
      loaded.sheetUrls = [...(loaded.sheetUrls ?? []), ...(joinLoaded.sourceUrls ?? [])];
    }

    return loaded as SheetData & {
      sheetUrls?: string[];
      datasets?: Record<string, SheetData>;
      tables?: string[];
      primaryTable?: string;
    };
  }, []);

  const loadFromDatabase = useCallback(
    async (
      data: SheetData & {
        sheetUrls?: string[];
        datasets?: Record<string, SheetData>;
        tables?: string[];
        primaryTable?: string;
      },
      projectLayout?: DashboardLayout | null,
      options?: { refresh?: boolean; preferredTable?: string | null }
    ) => {
      const isRefresh = options?.refresh ?? false;
      const preferredTable = options?.preferredTable?.trim() || null;
      setLoading(true);
      setError(null);
      const tableList =
        data.tables ??
        (data.primaryTable ? [data.primaryTable] : []);
      const datasets = data.datasets ?? null;
      const urls =
        data.sheetUrls ??
        (data.dataset?.sourceUrl ? [data.dataset.sourceUrl] : ["postgresql://loaded"]);
      setLastUrl(urls[0]);
      setSheetUrls(urls);
      setDbDatasets(datasets);
      setActiveDbTables(tableList);
      const keepTable = selectedDataTableRef.current;
      const defaultTable =
        (preferredTable && tableList.includes(preferredTable) ? preferredTable : null) ??
        (data.primaryTable && tableList.includes(data.primaryTable) ? data.primaryTable : null) ??
        tableList[0] ??
        "";
      if (isRefresh && keepTable && tableList.includes(keepTable)) {
        setSelectedDataTable(keepTable);
      } else {
        setSelectedDataTable(defaultTable);
      }
      if (!isRefresh) {
        setFilters({});
        setDrillFilter(null);
        setVisualQuery(EMPTY_VISUAL_QUERY);
        setFunnelMetrics(null);
        setDataScope(null);
      }

      try {
        setSheetData(data);
        if (!isRefresh) {
          setSavedMetrics([]);
          setFunnelMetrics(null);
        }
        logAuditClient(
          "sheet_load",
          `DB: ${data.dataset?.name ?? "PostgreSQL"}`,
          { rows: data.rows?.length },
          userRole
        );
        if (!isRefresh) {
          setActiveView("overview");
          setHeroCollapsed(true);
        }
        await initLayout(data, urls, projectLayout ?? resolveLayoutForReload(activeProjectRef.current));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [initLayout, userRole, resolveLayoutForReload]
  );

  const loadProject = useCallback(
    async (project: Project) => {
      openProject(project);
      if (project.sheetUrls.length > 0) {
        loadProjectSheets(project);
        return;
      }

      if (project.activeDbConnectionId && resolveProjectDbTables(project).length > 0) {
        setError(null);
        try {
          const loaded = await fetchDatabaseProjectData(project);
          await loadFromDatabase(loaded, resolveLayoutForReload(project), {
            preferredTable: project.activeDbTable,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal memuat database");
          setActiveView("overview");
        }
        return;
      }

      setActiveView("overview");
    },
    [loadProjectSheets, loadFromDatabase, openProject, resolveLayoutForReload, fetchDatabaseProjectData]
  );

  const handleSelectProject = useCallback(
    (project: Project) => {
      setSheetData(null);
      setDbDatasets(null);
      setActiveDbTables([]);
      setSelectedDataTable("");
      layoutRef.current = null;
      setLayout(null);
      setFilters({});
      setError(null);
      openProject(project);
      setActiveView("overview");
      if (projectHasSource(project)) {
        setLoadingMessage("Memuat data…");
        void loadProject(project).finally(() => setLoadingMessage(null));
      }
    },
    [openProject, loadProject]
  );

  const handleEditProject = useCallback(
    (project: Project) => {
      if (project.id !== activeProject?.id) {
        handleSelectProject(project);
      }
      setSettingsProject(project);
      setShowSettingsDialog(true);
    },
    [activeProject?.id, handleSelectProject]
  );

  const handleOpenProjectSettings = useCallback(() => {
    setSettingsProject(activeProject);
    setShowSettingsDialog(true);
  }, [activeProject]);

  const handleLoadActiveProject = useCallback(() => {
    if (!activeProject) return;
    void loadProject(activeProject);
  }, [activeProject, loadProject]);

  const handleProjectCreated = useCallback(
    (project: Project) => {
      setProjects((prev) => [project, ...prev]);
      setSheetData(null);
      setDbDatasets(null);
      setActiveDbTables([]);
      setSelectedDataTable("");
      layoutRef.current = null;
      setLayout(null);
      setFilters({});
      setError(null);
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

  const handleProjectDeleted = useCallback(
    (projectId: string) => {
      setShowSettingsDialog(false);
      setSettingsProject(null);
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);

      if (activeProject?.id !== projectId) return;

      const next = remaining[0] ?? null;
      setActiveProject(next);
      setSheetData(null);
      setDbDatasets(null);
      setActiveDbTables([]);
      setSelectedDataTable("");
      layoutRef.current = null;
      setLayout(null);
      setFilters({});
      setError(null);

      if (next) {
        syncProjectToUrl(next.id);
        setLoadingMessage("Memuat data…");
        void loadProject(next).finally(() => setLoadingMessage(null));
      } else {
        syncProjectToUrl(null);
        setActiveView("overview");
      }
    },
    [activeProject?.id, loadProject, projects]
  );

  const reloadProjectData = useCallback(
    async (project: Project, successMessage?: string) => {
      setSheetData(null);
      setDbDatasets(null);
      setActiveDbTables([]);
      setSelectedDataTable("");
      layoutRef.current = null;
      setLayout(null);
      setFilters({});
      setError(null);
      openProject(project);

      if (!projectHasSource(project)) return;

      setLoadingMessage("Memuat data…");
      try {
        if (project.sheetUrls.length > 0) {
          await loadSheets(
            project.sheetUrls,
            project.mergeMode,
            false,
            resolveLayoutForReload(project)
          );
        } else if (
          project.activeDbConnectionId &&
          resolveProjectDbTables(project).length > 0
        ) {
          const loaded = await fetchDatabaseProjectData(project);
          await loadFromDatabase(loaded, resolveLayoutForReload(project), {
            preferredTable: project.activeDbTable,
          });
        }
        if (successMessage) toast(successMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memuat data";
        setError(message);
        toast(
          successMessage
            ? "Pengaturan disimpan, tetapi gagal memuat data"
            : "Gagal memuat data",
          "error"
        );
      } finally {
        setLoadingMessage(null);
      }
    },
    [
      fetchDatabaseProjectData,
      loadFromDatabase,
      loadSheets,
      openProject,
      resolveLayoutForReload,
      toast,
    ]
  );

  const handleProjectSettingsSaved = useCallback(
    async (project: Project) => {
      setActiveProject(project);
      setProjects((prev) => prev.map((x) => (x.id === project.id ? project : x)));
      setShowSettingsDialog(false);

      if (!projectHasSource(project)) {
        toast("Pengaturan project disimpan");
        return;
      }

      await reloadProjectData(project, "Pengaturan disimpan & data dimuat ulang");
    },
    [reloadProjectData, toast]
  );

  const handleProjectReload = useCallback(
    async (project: Project) => {
      setShowSettingsDialog(false);
      await reloadProjectData(project, "Data dimuat ulang");
    },
    [reloadProjectData]
  );

  const { flushSave } = useLayoutAutoSave(
    layout,
    Boolean(layout),
    setSyncStatus,
    activeProject?.id
  );

  const handleSaveLayout = useCallback((next: DashboardLayout) => {
    setLayout(next);
    layoutRef.current = next;
    setActiveProject((prev) => (prev ? { ...prev, layout: next } : prev));
  }, []);

  const handleDerivedFieldsChange = useCallback(
    async (fields: DerivedField[]) => {
      const project = activeProjectRef.current;
      if (!project) return;
      setActiveProject({ ...project, derivedFields: fields });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, derivedFields: fields } : p))
      );
      await updateProject(project.id, { derivedFields: fields });
      toast("Kolom dihitung disimpan — cek Columns to show jika belum muncul di tabel", "info");
    },
    [toast]
  );

  const handleRefreshData = useCallback(async () => {
    const project = activeProjectRef.current;
    await flushSave();

    if (project && projectSourceType(project) === "database") {
      setLoading(true);
      setError(null);
      try {
        const loaded = await fetchDatabaseProjectData(project);
        await loadFromDatabase(loaded, resolveLayoutForReload(project), {
          refresh: true,
          preferredTable: project.activeDbTable,
        });
        const datasets = loaded.datasets ?? {};
        const parts = Object.entries(datasets).map(
          ([table, ds]) => `${table}: ${(ds.rows?.length ?? 0).toLocaleString("id-ID")}`
        );
        toast(
          parts.length
            ? `Data diperbarui · ${parts.join(" · ")}`
            : `Data diperbarui · ${(loaded.rows?.length ?? 0).toLocaleString("id-ID")} baris`,
          "info"
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat database");
      } finally {
        setLoading(false);
      }
      return;
    }

    void loadSheets(
      sheetUrls.length ? sheetUrls : [lastUrl],
      layout?.mergeMode ?? sheetUrls.length > 1,
      true,
      resolveLayoutForReload(project)
    );
  }, [
    flushSave,
    fetchDatabaseProjectData,
    lastUrl,
    layout?.mergeMode,
    loadFromDatabase,
    loadSheets,
    resolveLayoutForReload,
    sheetUrls,
    toast,
  ]);

  const { lastRefreshAt, refreshing, runRefresh } = useAutoRefresh(
    Boolean(sheetData),
    autoRefreshMinutes,
    handleRefreshData
  );

  const handleAutoRefreshChange = (minutes: AutoRefreshInterval) => {
    setAutoRefreshMinutes(minutes);
    if (userId) saveAutoRefreshMinutes(userId, minutes);
  };

  const handleReportScheduleChange = (minutes: ReportScheduleInterval) => {
    setReportScheduleMinutes(minutes);
    if (userId) saveReportScheduleMinutes(userId, minutes);
  };

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
        const fromList = list.find((p) => p.id === projectId);
        const project = (await fetchProject(projectId)) ?? fromList;
        if (project) {
          openProject(project);
          setHeroCollapsed(true);
          if (projectHasSource(project)) {
            setLoadingMessage("Memuat data…");
            void loadProject(project).finally(() => setLoadingMessage(null));
          }
          return;
        }
        syncProjectToUrl(null);
      }

      setHeroCollapsed(true);
      if (list.length === 0) {
        setShowCreateDialog(true);
      } else {
        const first = (await fetchProject(list[0].id)) ?? list[0];
        openProject(first);
        if (projectHasSource(first)) {
          setLoadingMessage("Memuat data…");
          void loadProject(first).finally(() => setLoadingMessage(null));
        }
      }
    };
    void boot();
  }, [auth.user, searchParams, openProject, refreshProjects, loadProject]);

  const exploredData = useMemo(() => {
    if (!sheetData) return null;
    if (selectedDataTable && dbDatasets?.[selectedDataTable]) {
      return dbDatasets[selectedDataTable];
    }
    return sheetData;
  }, [sheetData, dbDatasets, selectedDataTable]);

  const scopedBase = exploredData;

  const queryFilteredBase = useMemo(() => {
    if (!scopedBase) return null;
    if (!isVisualQueryActive(visualQuery)) return scopedBase;
    const rows = applyVisualQuery(scopedBase.rows, visualQuery, scopedBase.columns);
    return reanalyze({ ...scopedBase, rows }, {});
  }, [scopedBase, visualQuery]);

  const displayData = useMemo(() => {
    if (!queryFilteredBase) return null;
    let data = reanalyze(queryFilteredBase, filters);
    const fields = activeProject?.derivedFields ?? [];
    if (fields.length > 0) {
      data = sheetDataWithDerivedFields(data, fields);
    }
    return data;
  }, [queryFilteredBase, filters, activeProject?.derivedFields]);

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
      if (!userId) return;
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      setSavedMetrics(upsertSavedMetric(userId, urls, metric));
      logAuditClient("metric_save", metric.name, { formula: metric.formula }, userRole);
    },
    [sheetUrls, lastUrl, userRole, userId]
  );

  const handleCertifyMetric = useCallback(
    (id: string) => {
      if (!userId) return;
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      const updated = savedMetrics.map((m) =>
        m.id === id ? { ...m, status: "certified" as const } : m
      );
      const target = updated.find((m) => m.id === id);
      if (target) upsertSavedMetric(userId, urls, target);
      setSavedMetrics(updated);
    },
    [savedMetrics, sheetUrls, lastUrl, userId]
  );

  const handleRemoveMetric = useCallback(
    (id: string) => {
      if (!userId) return;
      const urls = sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : [];
      setSavedMetrics(removeSavedMetric(userId, urls, id));
    },
    [sheetUrls, lastUrl, userId]
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
            // Penanganan sebenarnya dilakukan di bawah (base layout) agar tidak
            // tertimpa oleh applyLayoutActions.
            break;
          case "add_derived_field": {
            const project = activeProjectRef.current;
            if (!project) break;
            const existing = project.derivedFields ?? [];
            const base = scopedBase ?? sheetData;
            const columnsData = existing.length
              ? sheetDataWithDerivedFields(base, existing)
              : base;
            const validation = validateNewDerivedField(
              action.name,
              action.formula,
              { columns: columnsData.columns, rows: columnsData.rows },
              existing,
              action.key
            );
            if (!validation.ok) {
              toast(validation.error, "error");
              break;
            }
            void handleDerivedFieldsChange([...existing, validation.field]);
            logAuditClient(
              "layout_change",
              `AI kolom custom: ${validation.field.name}`,
              { key: validation.field.key, formula: validation.field.formula },
              userRole
            );
            break;
          }
          default:
            break;
        }
      }

      if (layout) {
        const hasReset = actions.some((a) => a.type === "reset_layout");
        const baseLayout = hasReset ? createDefaultLayout(sheetUrls) : layout;
        const nextLayout = applyLayoutActions(baseLayout, actions, columns);
        setLayout(nextLayout);
        if (perms.canEditLayout && nextLayout !== layout) {
          void flushSave(nextLayout);
        }
      }

      if (needsReload && nextUrls.length > 0) {
        loadSheets(nextUrls, nextMerge);
      }
    },
    [sheetData, scopedBase, sheetUrls, layout, loadSheets, perms.canEditLayout, flushSave, handleDerivedFieldsChange, userRole, toast]
  );

  const handleWidgetProposalReceived = useCallback(() => {
    setActiveView("overview");
    setMobileNav(false);
    toast(
      "Widget siap — klik Ya terapkan atau Lihat preview di chat untuk menambahkannya ke Overview.",
      "info"
    );
  }, [toast]);

  const handleConfirmWidgetProposal = useCallback(
    (proposal: WidgetProposal): WidgetProposalConfirmResult => {
      if (!layout || !perms.canEditLayout) return { ok: false };
      const dataForWidget = viewData ?? sheetData;
      if (!dataForWidget) return { ok: false };

      const snapshot = cloneLayout(layout);
      const { layout: next, error } = applyWidgetProposal(layout, dataForWidget, proposal, dbDatasets);
      if (error) {
        toast(error);
        return { ok: false };
      }

      setLayout(next);
      void flushSave(next);
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
    [layout, perms.canEditLayout, viewData, sheetData, dbDatasets, flushSave, userRole, toast]
  );

  const handleConfirmWidgetProposals = useCallback(
    (proposals: WidgetProposal[]): WidgetProposalsConfirmResult => {
      if (!layout || !perms.canEditLayout) {
        return { ok: false, appliedCount: 0, errors: ["Tidak diizinkan mengubah layout"] };
      }
      const dataForWidget = viewData ?? sheetData;
      if (!dataForWidget) return { ok: false, appliedCount: 0, errors: ["Data belum siap"] };

      const snapshot = cloneLayout(layout);
      let working = layout;
      const errors: string[] = [];
      let applied = 0;
      for (const proposal of proposals) {
        const { layout: next, error } = applyWidgetProposal(working, dataForWidget, proposal, dbDatasets);
        if (error) {
          errors.push(error);
          continue;
        }
        working = next;
        applied += 1;
      }

      if (applied === 0) {
        if (errors.length) toast(errors[0]);
        return { ok: false, appliedCount: 0, errors };
      }

      setLayout(working);
      void flushSave(working);
      setActiveView("overview");
      setMobileNav(false);
      logAuditClient("layout_change", `AI widget batch: ${applied} widget`, { count: applied }, userRole);
      toast(
        `${applied} widget ditambahkan ke Overview${errors.length ? ` · ${errors.length} gagal` : ""}`
      );
      return { ok: true, appliedCount: applied, errors, layoutSnapshot: snapshot };
    },
    [layout, perms.canEditLayout, viewData, sheetData, dbDatasets, flushSave, userRole, toast]
  );

  const handleQueryDashboardWidget = useCallback(
    (
      result: VisualSqlResult,
      mode: QueryDashboardAddMode,
      chartType: import("@/lib/types").ChartType = "bar",
      sql = ""
    ) => {
      if (!layout || !perms.canEditLayout) return;
      const dataForWidget = scopedBase ?? viewData ?? sheetData;
      if (!dataForWidget) return;

      const maxOrder = layout.widgets.reduce((m, w) => Math.max(m, w.order), 0);
      const newWidgets = createQueryDashboardWidgets(
        result,
        mode,
        chartType,
        sql,
        dataForWidget,
        maxOrder,
        selectedDataTable || undefined
      );
      if (!newWidgets.length) return;

      const next = { ...layout, widgets: [...layout.widgets, ...newWidgets] };
      setLayout(next);
      void flushSave(next);
      setActiveView("overview");

      const label =
        mode === "both"
          ? "Grafik & tabel dari query ditambahkan ke Overview"
          : mode === "table"
            ? "Tabel dari query ditambahkan ke Overview"
            : "Grafik dari query ditambahkan ke Overview";
      toast(label);
    },
    [layout, perms.canEditLayout, scopedBase, viewData, sheetData, selectedDataTable, flushSave, toast]
  );

  const handleUndoWidgetLayout = useCallback(
    (snapshot: DashboardLayout) => {
      if (!perms.canEditLayout) return;
      setLayout(snapshot);
      void flushSave(snapshot);
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
      error={error}
      onCreateProject={() => setShowCreateDialog(true)}
      onOpenSettings={handleOpenProjectSettings}
    />
  );

  const renderView = () => {
    if (activeView === "audit") {
      return <AuditLogPanel />;
    }

    if (activeView === "sources") {
      return (
        <div className="space-y-4">
          <DataSourcePanel
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
            derivedFields={activeProject?.derivedFields ?? []}
            dbDatasets={dbDatasets}
            activeDbTables={activeDbTables}
            tableRelations={activeProject?.tableRelations}
            layout={layout}
            sheetUrls={sheetUrls}
            syncStatus={syncStatus}
            linkCopied={linkCopied}
            onBuilderOpenChange={setOverviewBuilderOpen}
            onSaveLayout={handleSaveLayout}
            onSaveNow={(override) => void flushSave(override)}
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
            onDerivedFieldsChange={handleDerivedFieldsChange}
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
            availableTables={activeDbTables}
            selectedTable={selectedDataTable}
            onSelectTable={setSelectedDataTable}
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
            description="Filter visual atau query SQL-like — hasil langsung ke grafik"
          >
            <div className="space-y-6">
              <QueryEditorPanel
                data={scopedBase}
                derivedFields={activeProject?.derivedFields ?? []}
                activeTable={selectedDataTable}
                dbDatasets={dbDatasets}
                availableTables={activeDbTables}
                tableRelations={activeProject?.tableRelations}
                onSelectTable={setSelectedDataTable}
                onAddToDashboard={(result, mode, chartType, sql) =>
                  handleQueryDashboardWidget(result, mode, chartType, sql)
                }
              />
              <VisualQueryPanel
                data={scopedBase}
                query={visualQuery}
                onChange={setVisualQuery}
                onApplyToDashboard={() => setActiveView("overview")}
                onClear={() => setVisualQuery(EMPTY_VISUAL_QUERY)}
                maskPII={perms.maskPII}
                canExport={perms.canExport}
              />
            </div>
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

  const handleLogout = useCallback(async () => {
    const currentUserId = auth.user?.id;
    if (currentUserId) clearUserLocalStorage(currentUserId);
    clearLegacyLocalStorage();
    await auth.logout();
    resetDashboardState();
    initRef.current = false;
    syncProjectToUrl(null);
  }, [auth, resetDashboardState]);

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
                onSettings={activeProject ? handleOpenProjectSettings : undefined}
                onEdit={handleEditProject}
                onDeleted={handleProjectDeleted}
              />
              {inDataDashboard && (
                <div className="hidden text-[11px] text-slate-500 md:flex md:items-center md:gap-1">
                  {activeDbTables.length > 1 ? (
                    <>
                      <span
                        className="shrink-0"
                        title="Mengganti tabel yang ditampilkan di tab Data, Charts, dan Insights"
                      >
                        Tabel aktif:
                      </span>
                      <DbTableSelect
                        value={selectedDataTable}
                        onChange={(table) => {
                          setSelectedDataTable(table);
                          if (activeView === "overview") {
                            setActiveView("data");
                          }
                        }}
                        tables={activeDbTables}
                        formatLabel={formatDbTableLabel}
                        size="xs"
                        ariaLabel="Pilih tabel untuk tab Data"
                      />
                      <span className="shrink-0 text-slate-400">
                        · {displayData?.rows.length.toLocaleString("id-ID")} baris
                        {displayData?.columns.length
                          ? ` · ${displayData.columns.length.toLocaleString("id-ID")} kolom`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      {displayData?.rows.length.toLocaleString("id-ID")} baris
                      {displayData?.columns.length
                        ? ` · ${displayData.columns.length.toLocaleString("id-ID")} kolom`
                        : ""}
                      {sheetData?.dataset?.name ? ` · ${sheetData.dataset.name}` : ""}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <UserMenu
                user={auth.user}
                onLogout={() => void handleLogout()}
                onOpenSettings={handleOpenProjectSettings}
                onResetWorkspace={() => void handleResetWorkspace()}
              />
              {sheetData && (
                <>
                  <SheetManagerMenu
                    sheetUrls={sheetUrls.length ? sheetUrls : lastUrl ? [lastUrl] : []}
                    projectSheetUrls={activeProject?.sheetUrls ?? sheetUrls}
                    projectId={activeProject?.id ?? null}
                    sheetLabels={(sheetData as { sheetLabels?: Record<string, string> } | null)?.sheetLabels}
                    sourceKind={
                      activeProject && projectSourceType(activeProject) === "database"
                        ? "database"
                        : "sheet"
                    }
                    activeDbTables={activeDbTables}
                    selectedTable={selectedDataTable}
                    mergeMode={layout?.mergeMode ?? sheetUrls.length > 1}
                    joinMode={joinModeActive}
                    loading={loading}
                    onSwitchSheet={handleSwitchSheet}
                    onSelectTable={(table) => {
                      setSelectedDataTable(table);
                      setActiveView("data");
                    }}
                    onAddSheet={handleAddSheetToMerge}
                    onRemoveSheet={handleRemoveSheetFromMerge}
                    onToggleMerge={handleToggleMergeMode}
                    onReload={() => void handleRefreshData()}
                    onOpenSettings={handleOpenProjectSettings}
                  />
                  <button
                    onClick={() => void handleRefreshData()}
                    disabled={loading}
                    className="btn-ghost disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  {(!activeProject || projectSourceType(activeProject) === "sheet") &&
                    sheetData.sourceUrl.startsWith("http") && (
                    <a
                      href={sheetData.sourceUrl.split(" | ")[0]?.trim() ?? sheetData.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Sheet</span>
                    </a>
                  )}
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
                className="absolute inset-0 cursor-pointer bg-slate-900/20 backdrop-blur-sm"
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
              userId={userId}
              data={viewData}
              activeView={activeView}
              filters={filters}
              dataScope={dataScope}
              totalRowCount={totalRowCount}
              userRole={userRole}
              layout={layout}
              sheetUrls={sheetUrls}
              dbDatasets={dbDatasets}
              activeDbTables={activeDbTables}
              tableRelations={activeProject?.tableRelations}
              derivedFields={activeProject?.derivedFields ?? []}
              onApplyActions={applyChatActions}
              onConfirmWidgetProposal={handleConfirmWidgetProposal}
              onConfirmWidgetProposals={handleConfirmWidgetProposals}
              onUndoWidgetLayout={handleUndoWidgetLayout}
              onWidgetProposalReceived={handleWidgetProposalReceived}
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

      {(settingsProject ?? activeProject) && (
        <AppDialog
          open={showSettingsDialog}
          onClose={() => {
            setShowSettingsDialog(false);
            setSettingsProject(null);
          }}
          title="Pengaturan project"
          description="Ubah nama, sumber data, dan relasi tabel"
          size="lg"
        >
          <ProjectSettingsDialogContent
            project={settingsProject ?? activeProject!}
            onUpdated={(p) => void handleProjectSettingsSaved(p)}
            onDeleted={handleProjectDeleted}
            onLoad={() => {
              void handleProjectReload(settingsProject ?? activeProject!);
            }}
            loading={loading}
          />
        </AppDialog>
      )}

    </div>
  );
}
