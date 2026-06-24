"use client";

import { useEffect, useState } from "react";
import type { DashboardLayout, SheetData, WidgetConfig, WidgetVisualShape, ChartType } from "@/lib/types";
import { getVisibleWidgets, updateWidget } from "@/lib/layout";
import { buildOverviewRows } from "@/lib/overview-layout";
import { resolveChartForWidget } from "@/lib/chart-builder";
import type { LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import { ChartCard } from "./ChartCard";
import { StatusDistribution } from "./StatusDistribution";
import { TopRecords } from "./TopRecords";
import { LayoutEditToolbar } from "./LayoutEditToolbar";
import { DashboardBuilderModal } from "./DashboardBuilderModal";
import { OverviewEmptyRecommendations } from "./OverviewEmptyRecommendations";
import { WidgetStatCard } from "./WidgetStatCard";
import {
  buildDistributionFromWidget,
  buildStatFromWidget,
  buildTableFromWidget,
  buildTopRecordsFromWidget,
} from "@/lib/widget-data";
import { DataTable } from "./DataTable";
import { cn } from "@/lib/utils";
import { Pencil, Download } from "lucide-react";
import { buildLayoutFromTemplate } from "@/lib/dashboard-templates";
import { buildCsvFromRows, downloadCsv } from "@/lib/report-schedule";
import { useToast } from "./ToastProvider";

interface OverviewDashboardProps {
  data: SheetData;
  layout: DashboardLayout;
  sheetUrls: string[];
  syncStatus: LayoutSyncStatus;
  linkCopied: boolean;
  onBuilderOpenChange?: (open: boolean) => void;
  onSaveLayout: (layout: DashboardLayout) => void;
  onSaveNow: () => void;
  onResetLayout: () => void;
  onCopyLink: () => void;
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReloadMerged: () => void;
}

export function OverviewDashboard({
  data,
  layout,
  sheetUrls,
  syncStatus,
  linkCopied,
  onBuilderOpenChange,
  onSaveLayout,
  onSaveNow,
  onResetLayout,
  onCopyLink,
  onAddSheet,
  onRemoveSheet,
  onToggleMerge,
  onReloadMerged,
}: OverviewDashboardProps) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitialShape, setBuilderInitialShape] = useState<WidgetVisualShape | undefined>();
  const [editWidgetId, setEditWidgetId] = useState<string | undefined>();
  const visible = getVisibleWidgets(layout);
  const rows = buildOverviewRows(visible);
  const { toast } = useToast();

  useEffect(() => {
    onBuilderOpenChange?.(builderOpen);
  }, [builderOpen, onBuilderOpenChange]);

  const openBuilder = (shape?: WidgetVisualShape) => {
    setEditWidgetId(undefined);
    setBuilderInitialShape(shape);
    setBuilderOpen(true);
  };

  const openEditWidget = (widgetId: string) => {
    setBuilderInitialShape(undefined);
    setEditWidgetId(widgetId);
    setBuilderOpen(true);
  };

  const handleUpdateWidget = (widgetId: string, patch: Partial<WidgetConfig>) => {
    const next = updateWidget(layout, widgetId, patch);
    onSaveLayout(next);
    onSaveNow();
  };

  const applyTemplate = (templateId: string) => {
    const next = buildLayoutFromTemplate(templateId, data, sheetUrls);
    if (!next) return;
    onSaveLayout(next);
    onSaveNow();
    toast("Template applied — edit widgets anytime");
  };

  const exportTableWidget = (widget: WidgetConfig) => {
    const table = buildTableFromWidget(data, widget);
    const keys = table.columns.map((c) => c.key);
    const csvRows = [...table.rows];
    if (table.summaryRow) csvRows.push(table.summaryRow);
    const csv = buildCsvFromRows(csvRows, keys);
    downloadCsv(`widget-${widget.title ?? widget.id}.csv`, csv);
    toast("Table exported to CSV");
  };

  const renderWidgetContent = (
    widget: WidgetConfig,
    opts?: { compactStat?: boolean }
  ) => {
    if (!widget.visualShape) return null;

    switch (widget.visualShape) {
      case "stat": {
        const stat = buildStatFromWidget(data, widget);
        if (!stat) return null;
        return <WidgetStatCard label={stat.label} value={stat.value} compact={opts?.compactStat} />;
      }
      case "distribution":
        return (
          <StatusDistribution
            items={buildDistributionFromWidget(data, widget)}
            title={widget.title ?? "Distribusi"}
          />
        );
      case "ranking":
        return (
          <TopRecords
            records={buildTopRecordsFromWidget(data, widget)}
            title={widget.title ?? "Ranking"}
          />
        );
      case "bar":
      case "line":
      case "donut": {
        const chart = resolveChartForWidget(data, widget);
        if (!chart) return null;
        return (
          <ChartCard
            chart={chart}
            controlledType={widget.chartType ?? chart.type}
            showTypePicker
            pickerStyle="select"
            onTypeChange={(chartType: ChartType) => {
              handleUpdateWidget(widget.id, { chartType });
              toast("Chart type saved");
            }}
          />
        );
      }
      case "table": {
        const table = buildTableFromWidget(data, widget);
        if (!table.rows.length) return null;
        return (
          <div className="surface-card overflow-hidden p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              {widget.title ? (
                <h3 className="text-sm font-semibold text-slate-900">{widget.title}</h3>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => exportTableWidget(widget)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
            </div>
            <DataTable
              rows={table.rows}
              columns={table.columns}
              canExport={false}
              compact
              fitContainer
              maxColumns={0}
              paginationMode="off"
              summaryRow={table.summaryRow}
            />
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderWidget = (
    widget: WidgetConfig,
    animIndex = 0,
    opts?: { compactStat?: boolean }
  ) => {
    const content = renderWidgetContent(widget, opts);
    if (!content) return null;
    return (
      <div
        key={widget.id}
        id={`widget-${widget.id}`}
        className={cn(
          "group relative animate-fade-in-up",
          `stagger-${Math.min(animIndex + 1, 6)}`
        )}
      >
        <button
          type="button"
          onClick={() => openEditWidget(widget.id)}
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:text-indigo-700 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Edit ${widget.title ?? "widget"}`}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        {content}
      </div>
    );
  };

  const renderRows = () => {
    let anim = 0;
    return rows.map((row, rowIdx) => {
      if (row.kind === "full") {
        const node = renderWidget(row.widgets[0], anim++);
        if (!node) return null;
        return (
          <div key={`row-${rowIdx}`} className="min-w-0 w-full">
            {node}
          </div>
        );
      }
      if (row.kind === "hero-pair") {
        const [hero, dist] = row.widgets;
        return (
          <div key={`row-${rowIdx}`} className="grid gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">{renderWidget(hero, anim++)}</div>
            <div className="min-w-0 lg:col-span-2">{renderWidget(dist, anim++)}</div>
          </div>
        );
      }
      return (
        <div
          key={`row-${rowIdx}`}
          className={cn(
            "grid gap-4",
            row.statRow
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              : "grid-cols-1 lg:grid-cols-2"
          )}
        >
          {row.widgets.map((widget) => (
            <div key={widget.id} className="min-w-0">
              {renderWidget(widget, anim++, { compactStat: row.statRow })}
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div className="overview-root relative space-y-5">
      <LayoutEditToolbar
        widgetCount={visible.length}
        linkCopied={linkCopied}
        onOpenBuilder={() => openBuilder()}
        onCopyLink={onCopyLink}
      />

      {visible.length === 0 ? (
        <OverviewEmptyRecommendations
          data={data}
          onOpenBuilder={() => openBuilder()}
          onApplyTemplate={applyTemplate}
        />
      ) : (
        <div className="space-y-5">{renderRows()}</div>
      )}

      {visible.length > 0 && !builderOpen && (
        <button
          type="button"
          onClick={() => openBuilder()}
          className="layer-chat fixed bottom-24 right-6 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 sm:bottom-8"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}

      <DashboardBuilderModal
        open={builderOpen}
        layout={layout}
        data={data}
        sheetUrls={sheetUrls}
        syncStatus={syncStatus}
        initialShape={builderInitialShape}
        initialEditWidgetId={editWidgetId}
        onClose={() => {
          setBuilderOpen(false);
          setBuilderInitialShape(undefined);
          setEditWidgetId(undefined);
        }}
        onSave={(newLayout) => {
          onSaveLayout(newLayout);
          onSaveNow();
          toast("Dashboard saved");
        }}
        onReset={onResetLayout}
        onAddSheet={onAddSheet}
        onRemoveSheet={onRemoveSheet}
        onToggleMerge={onToggleMerge}
        onReloadMerged={onReloadMerged}
      />
    </div>
  );
}
