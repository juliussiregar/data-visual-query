"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardLayout, SheetData, WidgetConfig } from "@/lib/types";
import type { LayoutTemplateId } from "@/lib/layout";
import { getVisibleWidgets } from "@/lib/layout";
import { buildOverviewRows } from "@/lib/overview-layout";
import { resolveChartForWidget } from "@/lib/chart-builder";
import type { LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import type { Filters } from "@/lib/filters";
import { KPICards } from "./KPICards";
import { ChartCard } from "./ChartCard";
import { StatusDistribution } from "./StatusDistribution";
import { TopRecords } from "./TopRecords";
import { InsightsPanel } from "./InsightsPanel";
import { HeroChart } from "./HeroChart";
import { LayoutEditToolbar } from "./LayoutEditToolbar";
import { LayoutTemplateBar } from "./LayoutTemplateBar";
import { DashboardBuilderModal } from "./DashboardBuilderModal";
import { OverviewHeader } from "./OverviewHeader";
import { DatasetCatalogPanel } from "./DatasetCatalogPanel";
import { MetricsLibraryPanel } from "./MetricsLibraryPanel";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Pencil, Plus } from "lucide-react";

interface OverviewDashboardProps {
  data: SheetData;
  layout: DashboardLayout;
  sheetUrls: string[];
  syncStatus: LayoutSyncStatus;
  linkCopied: boolean;
  filters?: Filters;
  distributionColumnKey?: string;
  activeTemplate?: LayoutTemplateId | null;
  onDrillDown?: (columnKey: string, value: string) => void;
  onApplyTemplate?: (templateId: LayoutTemplateId) => void;
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
  filters = {},
  distributionColumnKey,
  activeTemplate,
  onDrillDown,
  onApplyTemplate,
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
  const autoOpenedRef = useRef(false);
  const visible = getVisibleWidgets(layout);
  const rows = buildOverviewRows(layout.widgets);

  useEffect(() => {
    if (!autoOpenedRef.current && visible.length === 0) {
      autoOpenedRef.current = true;
      setBuilderOpen(true);
    }
  }, [visible.length]);

  useEffect(() => {
    onBuilderOpenChange?.(builderOpen);
  }, [builderOpen, onBuilderOpenChange]);

  const openBuilder = () => setBuilderOpen(true);

  const chartDrill = (chart: { categoryKey: string }) =>
    onDrillDown ? (value: string) => onDrillDown(chart.categoryKey, value) : undefined;

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case "kpis":
        return <KPICards metrics={data.kpis} />;
      case "hero_chart": {
        const chart = resolveChartForWidget(data, widget);
        if (!chart) return null;
        return <HeroChart chart={chart} onDrillDown={chartDrill(chart)} />;
      }
      case "distribution":
        return (
          <StatusDistribution
            items={data.distributions}
            onDrillDown={
              distributionColumnKey && onDrillDown
                ? (value) => onDrillDown(distributionColumnKey, value)
                : undefined
            }
            activeValue={distributionColumnKey ? filters[distributionColumnKey] : undefined}
          />
        );
      case "top_records":
        return <TopRecords records={data.topRecords} />;
      case "insights":
        return (
          <div className="surface-card p-5">
            <InsightsPanel insights={data.insights} />
          </div>
        );
      case "chart": {
        const chart = resolveChartForWidget(data, widget);
        if (!chart) return null;
        return (
          <ChartCard
            chart={chart}
            controlledType={widget.chartType}
            showTypePicker
            compactPicker
            onDrillDown={chartDrill(chart)}
          />
        );
      }
      default:
        return null;
    }
  };

  const renderWidget = (widget: WidgetConfig, animIndex = 0) => {
    const content = renderWidgetContent(widget);
    if (!content) return null;
    return (
      <div
        key={widget.id}
        id={`widget-${widget.id}`}
        className={cn("animate-fade-in-up", `stagger-${Math.min(animIndex + 1, 6)}`)}
      >
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
        return <div key={`row-${rowIdx}`}>{node}</div>;
      }
      if (row.kind === "hero-pair") {
        const [hero, dist] = row.widgets;
        return (
          <div key={`row-${rowIdx}`} className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">{renderWidget(hero, anim++)}</div>
            <div className="lg:col-span-2">{renderWidget(dist, anim++)}</div>
          </div>
        );
      }
      const [a, b] = row.widgets;
      return (
        <div key={`row-${rowIdx}`} className="grid gap-4 lg:grid-cols-2">
          {renderWidget(a, anim++)}
          {renderWidget(b, anim++)}
        </div>
      );
    });
  };

  return (
    <div className="overview-root relative space-y-5">
      <LayoutEditToolbar
        widgetCount={visible.length}
        linkCopied={linkCopied}
        onOpenBuilder={openBuilder}
        onCopyLink={onCopyLink}
      />

      <div className="space-y-5">
        {data.dataset && <DatasetCatalogPanel dataset={data.dataset} />}

        {data.metrics && data.metrics.length > 0 && (
          <MetricsLibraryPanel metrics={data.metrics} values={data.metricValues} />
        )}

        {onApplyTemplate && (
          <LayoutTemplateBar
            data={data}
            activeTemplate={activeTemplate}
            onApply={onApplyTemplate}
          />
        )}

        {visible.length > 0 && (
          <OverviewHeader
            data={data}
            widgetCount={visible.length}
            mergeMode={layout.mergeMode}
            sheetCount={sheetUrls.length}
          />
        )}

        {layout.mergeMode && sheetUrls.length > 1 && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            {sheetUrls.length} sheet digabung · {data.rows.length.toLocaleString("id-ID")} baris
          </div>
        )}

        {visible.length === 0 ? (
          <div className="overview-empty">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <LayoutDashboard className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">Dashboard masih kosong</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Pilih template atau tambah widget dari builder.
            </p>
            <button
              type="button"
              onClick={openBuilder}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Mulai Atur Dashboard
            </button>
          </div>
        ) : (
          renderRows()
        )}
      </div>

      {visible.length > 0 && !builderOpen && (
        <button
          type="button"
          onClick={openBuilder}
          className="layer-chat fixed bottom-24 right-6 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 sm:bottom-8"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Atur</span>
        </button>
      )}

      <DashboardBuilderModal
        open={builderOpen}
        layout={layout}
        data={data}
        sheetUrls={sheetUrls}
        syncStatus={syncStatus}
        onClose={() => setBuilderOpen(false)}
        onSave={(newLayout) => {
          onSaveLayout(newLayout);
          onSaveNow();
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
