"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  ListOrdered,
  Monitor,
  Sparkles,
  Trophy,
  PieChart,
  ChevronRight,
} from "lucide-react";
import type { WidgetConfig, WidgetType } from "@/lib/types";
import { LAYOUT_TEMPLATES, widgetLabel, type LayoutTemplateId } from "@/lib/layout";
import type { SheetData } from "@/lib/types";
import { cn } from "@/lib/utils";

const WIDGET_ICONS: Record<WidgetType, typeof LayoutDashboard> = {
  kpis: LayoutDashboard,
  hero_chart: LineChart,
  distribution: PieChart,
  top_records: Trophy,
  insights: Lightbulb,
  chart: BarChart3,
};

const TEMPLATE_ICONS: Record<LayoutTemplateId, typeof LayoutDashboard> = {
  ringkas: LayoutDashboard,
  manajemen: BarChart3,
  presentasi: Monitor,
};

interface DashboardEditorSidebarProps {
  data: SheetData;
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: string, visible: boolean) => void;
  onMoveWidget: (widgetId: string, dir: "up" | "down") => void;
  onApplyTemplate: (id: LayoutTemplateId) => void;
  onScrollToWidget?: (widgetId: string) => void;
}

export function DashboardEditorSidebar({
  data,
  widgets,
  onToggleWidget,
  onMoveWidget,
  onApplyTemplate,
  onScrollToWidget,
}: DashboardEditorSidebarProps) {
  const [guideOpen, setGuideOpen] = useState(true);
  const sorted = [...widgets].sort((a, b) => a.order - b.order);
  const visibleCount = sorted.filter((w) => w.visible).length;
  const progress = sorted.length > 0 ? Math.round((visibleCount / sorted.length) * 100) : 0;

  return (
    <aside className="space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-900">Widget aktif</span>
          <span className="text-indigo-600">{visibleCount}/{sorted.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Panduan collapsible */}
      <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
        <button
          type="button"
          onClick={() => setGuideOpen(!guideOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-xs font-semibold text-indigo-700">Cara pakai</span>
          <ChevronRight className={cn("h-4 w-4 text-indigo-400 transition-transform", guideOpen && "rotate-90")} />
        </button>
        {guideOpen && (
          <ol className="space-y-2 border-t border-indigo-500/15 px-4 pb-4 pt-2 text-[11px] text-slate-400">
            <li>1. Pilih template atau centang widget</li>
            <li>2. Atur urutan dengan ↑ ↓</li>
            <li>3. Preview kanan → Ubah Grafik jika perlu</li>
            <li>4. Klik <strong className="text-slate-600">Selesai</strong></li>
          </ol>
        )}
      </div>

      {/* Template */}
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Template cepat
        </p>
        <div className="space-y-2">
          {LAYOUT_TEMPLATES.map((t) => {
            const Icon = TEMPLATE_ICONS[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onApplyTemplate(t.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-500/25 group-hover:bg-violet-500/25">
                  <Icon className="h-4 w-4 text-violet-300" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900">{t.label}</span>
                  <span className="block truncate text-[10px] text-slate-500">{t.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Widget list */}
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-900">
          <ListOrdered className="h-4 w-4 text-cyan-400" />
          Daftar widget
        </p>
        <ul className="space-y-1.5">
          {sorted.map((widget) => {
            const Icon = WIDGET_ICONS[widget.type];
            const label = widgetLabel(widget, data);
            const visibleWidgets = sorted.filter((w) => w.visible);
            const visibleIdx = visibleWidgets.findIndex((w) => w.id === widget.id);
            const canUp = widget.visible && visibleIdx > 0;
            const canDown = widget.visible && visibleIdx >= 0 && visibleIdx < visibleWidgets.length - 1;

            return (
              <li
                key={widget.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 transition-all",
                  widget.visible
                    ? "border-indigo-500/25 bg-indigo-500/[0.08]"
                    : "border-transparent bg-white/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={widget.visible}
                      onChange={(e) => onToggleWidget(widget.id, e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-slate-200 accent-indigo-500"
                    />
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        widget.visible ? "bg-indigo-100" : "bg-slate-50"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", widget.visible ? "text-indigo-600" : "text-slate-600")} />
                    </div>
                    <span
                      className={cn(
                        "truncate text-xs",
                        widget.visible ? "font-medium text-slate-100" : "text-slate-500"
                      )}
                    >
                      {label}
                    </span>
                  </label>
                  {widget.visible && (
                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200">
                      <button
                        type="button"
                        disabled={!canUp}
                        onClick={() => onMoveWidget(widget.id, "up")}
                        className="px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!canDown}
                        onClick={() => onMoveWidget(widget.id, "down")}
                        className="border-l border-slate-200 px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {widget.visible && onScrollToWidget && (
                  <button
                    type="button"
                    onClick={() => onScrollToWidget(widget.id)}
                    className="mt-2 text-[10px] font-medium text-indigo-400/80 hover:text-indigo-600"
                  >
                    Lihat di preview →
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
