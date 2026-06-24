"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardLayout, SheetData, WidgetConfig } from "@/lib/types";
import { getVisibleWidgets } from "@/lib/layout";
import { buildOverviewRows } from "@/lib/overview-layout";
import { resolveChartForWidget } from "@/lib/chart-builder";
import type { LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import { KPICards } from "./KPICards";
import { ChartCard } from "./ChartCard";
import { StatusDistribution } from "./StatusDistribution";
import { TopRecords } from "./TopRecords";
import { InsightsPanel } from "./InsightsPanel";
import { HeroChart } from "./HeroChart";
import { LayoutEditToolbar } from "./LayoutEditToolbar";
import { DashboardBuilderModal } from "./DashboardBuilderModal";
import { OverviewHeader } from "./OverviewHeader";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Pencil, Plus } from "lucide-react";

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

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case "kpis":
        return <KPICards metrics={data.kpis} />;
      case "hero_chart": {
        const chart = resolveChartForWidget(data, widget);
        if (!chart) return null;
        return <HeroChart chart={chart} />;
      }
      case "distribution":
        return <StatusDistribution items={data.distributions} />;
      case "top_records":
        return <TopRecords records={data.topRecords} />;
      case "insights":
        return (
          <div className="glass-card rounded-2xl p-5">
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
          <div key={`row-${rowIdx}`} className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">{renderWidget(hero, anim++)}</div>
            <div className="lg:col-span-2">{renderWidget(dist, anim++)}</div>
          </div>
        );
      }
      const [a, b] = row.widgets;
      return (
        <div key={`row-${rowIdx}`} className="grid gap-6 lg:grid-cols-2">
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

      <div className="space-y-6">
        {visible.length > 0 && (
          <OverviewHeader
            data={data}
            widgetCount={visible.length}
            mergeMode={layout.mergeMode}
            sheetCount={sheetUrls.length}
          />
        )}

        {layout.mergeMode && sheetUrls.length > 1 && (
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5 text-xs text-cyan-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            {sheetUrls.length} Google Sheet digabung · {data.rows.length} baris total
          </div>
        )}

        {visible.length === 0 ? (
          <div className="overview-empty">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
                <LayoutDashboard className="h-10 w-10 text-indigo-400" />
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">Dashboard masih kosong</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Pilih widget dari builder — setiap widget punya siluet pratinjau supaya mudah
              dibayangkan sebelum ditambahkan.
            </p>
            <button
              type="button"
              onClick={openBuilder}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/40"
            >
              <Plus className="h-5 w-5" />
              Mulai Atur Dashboard
            </button>
          </div>
        ) : (
          renderRows()
        )}
      </div>

      {/* FAB edit saat sudah ada widget */}
      {visible.length > 0 && !builderOpen && (
        <button
          type="button"
          onClick={openBuilder}
          className="layer-chat fixed bottom-24 right-6 flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/40 transition-all hover:scale-105 hover:bg-indigo-400 sm:bottom-8"
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
