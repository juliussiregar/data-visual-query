"use client";

import { useState } from "react";
import { EyeOff, Settings2 } from "lucide-react";
import type { ChartType, ColumnMeta, SheetData, WidgetConfig } from "@/lib/types";
import { ALL_CHART_TYPES } from "@/lib/types";
import { widgetLabel } from "@/lib/layout";
import { cn } from "@/lib/utils";

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  donut: "Donat",
  pie: "Pie",
  bar: "Batang",
  horizontalBar: "Batang horizontal",
  stackedBar: "Batang bertumpuk",
  line: "Garis",
  area: "Area",
  radial: "Radial",
  scatter: "Scatter",
  treemap: "Peta pohon",
  radar: "Radar",
  composed: "Kombinasi",
};

interface WidgetEditShellProps {
  widget: WidgetConfig;
  data: SheetData;
  editMode: boolean;
  children: React.ReactNode;
  onHide: () => void;
  onUpdate: (patch: Partial<WidgetConfig>) => void;
}

export function WidgetEditShell({
  widget,
  data,
  editMode,
  children,
  onHide,
  onUpdate,
}: WidgetEditShellProps) {
  const [showSettings, setShowSettings] = useState(false);

  if (!editMode) return <>{children}</>;

  const isChart = widget.type === "chart" || widget.type === "hero_chart";
  const categoryCols = data.columns.filter(
    (c) => c.type === "category" || c.type === "text"
  );
  const numericCols = data.columns.filter((c) => c.type === "number");

  return (
    <div
      id={`widget-${widget.id}`}
      className="overflow-hidden rounded-2xl ring-1 ring-indigo-500/25 ring-offset-1 ring-offset-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-500/[0.07] px-3 py-2 sm:px-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-600/90">
          {widgetLabel(widget, data)}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {isChart && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                showSettings
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-100 text-indigo-100 hover:bg-slate-200"
              )}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Ubah Grafik
            </button>
          )}
          <button
            type="button"
            onClick={onHide}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/20"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Sembunyikan
          </button>
        </div>
      </div>

      {showSettings && isChart && (
        <ChartWidgetSettings
          widget={widget}
          categoryCols={categoryCols}
          numericCols={numericCols}
          onUpdate={onUpdate}
        />
      )}

      <div>{children}</div>
    </div>
  );
}

function ChartWidgetSettings({
  widget,
  categoryCols,
  numericCols,
  onUpdate,
}: {
  widget: WidgetConfig;
  categoryCols: ColumnMeta[];
  numericCols: ColumnMeta[];
  onUpdate: (patch: Partial<WidgetConfig>) => void;
}) {
  return (
    <div className="border-b border-slate-200 bg-white/60 px-4 py-4">
      <p className="mb-3 text-xs text-slate-400">Sesuaikan bentuk dan sumber data grafik</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Bentuk grafik</span>
          <select
            value={widget.chartType ?? "bar"}
            onChange={(e) => onUpdate({ chartType: e.target.value as ChartType })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500/50 focus:outline-none"
          >
            {ALL_CHART_TYPES.map((t) => (
              <option key={t} value={t}>
                {CHART_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Kelompokkan berdasarkan</span>
          <select
            value={widget.categoryKey ?? ""}
            onChange={(e) => onUpdate({ categoryKey: e.target.value || undefined })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="">Otomatis</option>
            {categoryCols.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Nilai angka</span>
          <select
            value={widget.valueKey ?? ""}
            onChange={(e) => onUpdate({ valueKey: e.target.value || undefined })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="">Hitung jumlah baris</option>
            {numericCols.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Cara hitung</span>
          <select
            value={widget.aggregation ?? "count"}
            onChange={(e) =>
              onUpdate({ aggregation: e.target.value as "count" | "sum" | "avg" })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="count">Jumlah</option>
            <option value="sum">Total</option>
            <option value="avg">Rata-rata</option>
          </select>
        </label>
      </div>
    </div>
  );
}
