"use client";

import { useEffect, useState } from "react";
import type { DashboardLayout, SheetData, WidgetConfig, WidgetVisualShape, ChartType } from "@/lib/types";
import { getVisibleWidgets, updateWidget, dragReorderWidget } from "@/lib/layout";
import { buildOverviewRows, overviewStatRowColumns } from "@/lib/overview-layout";
import { resolveChartForWidget } from "@/lib/chart-builder";
import type { TableRelation } from "@/lib/sql-query-types";
import type { DerivedField } from "@/lib/derived-fields";
import { sheetDataWithDerivedFields } from "@/lib/derived-fields";
import { resolveWidgetSheetData } from "@/lib/db-table-datasets";
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
import { TableWidgetPanel } from "./TableWidgetPanel";
import { resolveTablePanelHeight, tablePanelNeedsScroll } from "@/lib/table-panel";
import { cn } from "@/lib/utils";
import { Pencil, Download, GripVertical } from "lucide-react";
import { buildLayoutFromTemplate } from "@/lib/dashboard-templates";
import { buildCsvFromRows, downloadCsv } from "@/lib/report-schedule";
import { useToast } from "./ToastProvider";

interface OverviewDashboardProps {
  data: SheetData;
  derivedFields?: DerivedField[];
  dbDatasets?: Record<string, SheetData> | null;
  activeDbTables?: string[];
  tableRelations?: TableRelation[];
  layout: DashboardLayout;
  sheetUrls: string[];
  syncStatus: LayoutSyncStatus;
  linkCopied: boolean;
  onBuilderOpenChange?: (open: boolean) => void;
  onSaveLayout: (layout: DashboardLayout) => void;
  onSaveNow: (layout?: DashboardLayout) => void;
  onResetLayout: () => void;
  onCopyLink: () => void;
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReloadMerged: () => void;
  onDerivedFieldsChange?: (fields: DerivedField[]) => void | Promise<void>;
}

export function OverviewDashboard({
  data,
  derivedFields = [],
  dbDatasets,
  activeDbTables = [],
  tableRelations,
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
  onDerivedFieldsChange,
}: OverviewDashboardProps) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitialShape, setBuilderInitialShape] = useState<WidgetVisualShape | undefined>();
  const [editWidgetId, setEditWidgetId] = useState<string | undefined>();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const visible = getVisibleWidgets(layout);
  const { toast } = useToast();

  const dataForWidget = (widget: WidgetConfig) =>
    sheetDataWithDerivedFields(
      resolveWidgetSheetData(data, dbDatasets, widget),
      derivedFields
    );

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
    onSaveNow(next);
  };

  const applyTemplate = (templateId: string) => {
    const next = buildLayoutFromTemplate(templateId, data, sheetUrls);
    if (!next) return;
    onSaveLayout(next);
    onSaveNow(next);
    toast("Template applied — edit widgets anytime");
  };

  const handleTableHeightChange = (widgetId: string, px: number) => {
    const next = updateWidget(layout, widgetId, { tablePanelHeightPx: px });
    onSaveLayout(next);
    onSaveNow(next);
  };

  const exportTableWidget = (widget: WidgetConfig) => {
    const table = buildTableFromWidget(dataForWidget(widget), widget);
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
        const stat = buildStatFromWidget(dataForWidget(widget), widget);
        if (!stat) return null;
        return <WidgetStatCard label={stat.label} value={stat.value} compact={opts?.compactStat} />;
      }
      case "distribution":
        return (
          <StatusDistribution
            items={buildDistributionFromWidget(dataForWidget(widget), widget)}
            title={widget.title ?? "Distribusi"}
          />
        );
      case "ranking":
        return (
          <TopRecords
            records={buildTopRecordsFromWidget(dataForWidget(widget), widget)}
            title={widget.title ?? "Ranking"}
          />
        );
      case "bar":
      case "line":
      case "donut": {
        const chart = resolveChartForWidget(dataForWidget(widget), widget);
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
        const table = buildTableFromWidget(dataForWidget(widget), widget);
        if (!table.rows.length) return null;
        const panelHeight = resolveTablePanelHeight(widget, {
          rowCount: table.totalRows,
          hasSummaryRow: Boolean(table.summaryRow),
        });
        const showScrollHint = tablePanelNeedsScroll(
          table.totalRows,
          panelHeight,
          Boolean(table.summaryRow)
        );
        return (
          <TableWidgetPanel
            height={panelHeight}
            onHeightChange={(px) => handleTableHeightChange(widget.id, px)}
            header={
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {widget.title ? (
                    <h3 className="text-sm font-semibold text-slate-900">{widget.title}</h3>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {table.totalRows.toLocaleString("id-ID")} baris
                    {showScrollHint ? " · scroll" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => exportTableWidget(widget)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditWidget(widget.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </div>
            }
          >
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
          </TableWidgetPanel>
        );
      }
      default:
        return null;
    }
  };

  const handleDropOnWidget = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = dragReorderWidget(layout, draggingId, targetId);
    onSaveLayout(next);
    onSaveNow(next);
    setDraggingId(null);
    setDropTargetId(null);
  };

  const renderWidget = (
    widget: WidgetConfig,
    animIndex = 0,
    opts?: { compactStat?: boolean }
  ) => {
    const content = renderWidgetContent(widget, opts);
    if (!content) return null;
    const isDragging = draggingId === widget.id;
    const isDropTarget = dropTargetId === widget.id && draggingId !== widget.id;
    const isTableWidget = widget.visualShape === "table";

    return (
      <div
        key={widget.id}
        id={`widget-${widget.id}`}
        onDragOver={(e) => {
          if (!draggingId || draggingId === widget.id) return;
          e.preventDefault();
          setDropTargetId(widget.id);
        }}
        onDragLeave={() => {
          if (dropTargetId === widget.id) setDropTargetId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDropOnWidget(widget.id);
        }}
        className={cn(
          "group relative animate-fade-in-up rounded-2xl transition-shadow",
          `stagger-${Math.min(animIndex + 1, 6)}`,
          isDragging && "opacity-45",
          isDropTarget && "ring-2 ring-indigo-400 ring-offset-2"
        )}
      >
        <div
          draggable
          onDragStart={(e) => {
            setDraggingId(widget.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", widget.id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTargetId(null);
          }}
          className={cn(
            "absolute z-10 flex cursor-grab items-center rounded-lg border border-slate-200/80 bg-white/95 p-1.5 text-slate-500 shadow-sm backdrop-blur-sm active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-100",
            isTableWidget
              ? "left-2 top-1/2 -translate-y-1/2"
              : "left-3 top-3"
          )}
          aria-label={`Drag ${widget.title ?? "widget"}`}
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        {!isTableWidget && (
          <button
            type="button"
            onClick={() => openEditWidget(widget.id)}
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300 hover:text-indigo-700 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Edit ${widget.title ?? "widget"}`}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
        {content}
      </div>
    );
  };

  const renderOverviewGrid = () => {
    const rows = buildOverviewRows(layout.widgets);
    let anim = 0;

    return rows.map((row, rowIndex) => {
      if (row.kind === "full") {
        const w = row.widgets[0];
        const node = renderWidget(w, anim++);
        if (!node) return null;
        return (
          <div key={`row-${rowIndex}-${w.id}`} className="min-w-0">
            {node}
          </div>
        );
      }

      if (row.kind === "hero-pair") {
        const [w, next] = row.widgets;
        return (
          <div key={`row-${rowIndex}-hero`} className="min-w-0">
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="min-w-0 lg:col-span-3">{renderWidget(w, anim++)}</div>
              <div className="min-w-0 lg:col-span-2">{renderWidget(next, anim++)}</div>
            </div>
          </div>
        );
      }

      const count = row.widgets.length;
      const gridClass = cn(
        "grid gap-3",
        row.statRow
          ? overviewStatRowColumns(count)
          : count === 1
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2"
      );

      return (
        <div key={`row-${rowIndex}-grid`} className={gridClass}>
          {row.widgets.map((w) => {
            const node = renderWidget(w, anim++, {
              compactStat: row.statRow && count > 1,
            });
            if (!node) return null;
            return (
              <div key={w.id} className="min-w-0">
                {node}
              </div>
            );
          })}
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
        <div className="space-y-3">{renderOverviewGrid()}</div>
      )}

      <DashboardBuilderModal
        open={builderOpen}
        layout={layout}
        data={data}
        derivedFields={derivedFields}
        dbDatasets={dbDatasets}
        activeDbTables={activeDbTables}
        tableRelations={tableRelations}
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
          onSaveNow(newLayout);
          toast("Dashboard saved");
        }}
        onReset={onResetLayout}
        onAddSheet={onAddSheet}
        onRemoveSheet={onRemoveSheet}
        onToggleMerge={onToggleMerge}
        onReloadMerged={onReloadMerged}
        onDerivedFieldsChange={onDerivedFieldsChange}
      />
    </div>
  );
}
