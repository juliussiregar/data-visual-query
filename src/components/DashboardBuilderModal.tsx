"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import type { ChartType, DashboardLayout, SheetData, WidgetConfig } from "@/lib/types";
import { ALL_CHART_TYPES } from "@/lib/types";
import {
  LAYOUT_TEMPLATES,
  applyLayoutTemplate,
  widgetLabel,
  type LayoutTemplateId,
} from "@/lib/layout";
import { getVisibleWidgets } from "@/lib/layout";
import { LayoutSilhouettePreview, WidgetSilhouette } from "./WidgetSilhouette";
import { MultiSheetPanel } from "./MultiSheetPanel";
import type { LayoutSyncStatus } from "@/hooks/useLayoutAutoSave";
import { cn } from "@/lib/utils";

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  donut: "Donat",
  pie: "Pie",
  bar: "Batang",
  horizontalBar: "Horizontal",
  stackedBar: "Bertumpuk",
  line: "Garis",
  area: "Area",
  radial: "Radial",
  scatter: "Scatter",
  treemap: "Treemap",
  radar: "Radar",
  composed: "Kombinasi",
};

const WIDGET_DESC: Record<string, string> = {
  kpis: "Angka ringkasan utama",
  hero_chart: "Grafik besar sorotan",
  distribution: "Bar proporsi kategori",
  top_records: "Ranking nilai tertinggi",
  insights: "Temuan otomatis dari data",
  chart: "Grafik tambahan kustom",
};

const TEMPLATE_PREVIEW: Record<LayoutTemplateId, { type: WidgetConfig["type"]; id: string }[]> = {
  ringkas: [
    { id: "1", type: "kpis" },
    { id: "2", type: "hero_chart" },
  ],
  manajemen: [
    { id: "1", type: "kpis" },
    { id: "2", type: "distribution" },
    { id: "3", type: "insights" },
  ],
  presentasi: [
    { id: "1", type: "hero_chart" },
    { id: "2", type: "chart" },
    { id: "3", type: "chart" },
  ],
};

interface DashboardBuilderModalProps {
  open: boolean;
  layout: DashboardLayout;
  data: SheetData;
  sheetUrls: string[];
  syncStatus: LayoutSyncStatus;
  onClose: () => void;
  onSave: (layout: DashboardLayout) => void;
  onReset: () => void;
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReloadMerged: () => void;
}

export function DashboardBuilderModal(props: DashboardBuilderModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !props.open) return null;

  return createPortal(<BuilderDialog {...props} />, document.body);
}

function BuilderDialog({
  open,
  layout,
  data,
  sheetUrls,
  syncStatus,
  onClose,
  onSave,
  onReset,
  onAddSheet,
  onRemoveSheet,
  onToggleMerge,
  onReloadMerged,
}: DashboardBuilderModalProps) {
  const [draft, setDraft] = useState<DashboardLayout>(layout);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(structuredClone(layout));
      setSelectedId(null);
    }
  }, [open, layout]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const sorted = [...draft.widgets].sort((a, b) => a.order - b.order);
  const visible = getVisibleWidgets(draft);
  const selected = selectedId ? draft.widgets.find((w) => w.id === selectedId) : null;

  const toggleWidget = (widgetId: string) => {
    setSelectedId(widgetId);
    setDraft({
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: draft.widgets.map((x) =>
        x.id === widgetId ? { ...x, visible: !x.visible } : x
      ),
    });
  };

  const moveWidget = (widgetId: string, dir: "up" | "down") => {
    const vis = getVisibleWidgets(draft);
    const idx = vis.findIndex((w) => w.id === widgetId);
    if (idx < 0) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= vis.length) return;
    const a = vis[idx];
    const b = vis[swapIdx];
    setDraft({
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: draft.widgets.map((w) => {
        if (w.id === a.id) return { ...w, order: b.order };
        if (w.id === b.id) return { ...w, order: a.order };
        return w;
      }),
    });
  };

  const patchWidget = (widgetId: string, patch: Partial<WidgetConfig>) => {
    setDraft({
      ...draft,
      updatedAt: new Date().toISOString(),
      widgets: draft.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
    });
  };

  const applyTemplate = (id: LayoutTemplateId) => {
    setDraft(applyLayoutTemplate(id, draft, data));
    setSelectedId(null);
  };

  const isChart = selected?.type === "chart" || selected?.type === "hero_chart";
  const categoryCols = data.columns.filter((c) => c.type === "category" || c.type === "text");
  const numericCols = data.columns.filter((c) => c.type === "number");

  return (
    <div
      className="layer-modal fixed inset-0 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atur dashboard"
        className="layer-modal-panel chat-pop-in relative flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/60 sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-600/15 via-violet-600/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-indigo-300">
                <Sparkles className="h-3 w-3" />
                Builder Dashboard
              </div>
              <h2 className="text-lg font-bold text-white sm:text-xl">Susun Tampilan Overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Klik widget untuk menambah · pratinjau siluet di panel kanan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 sm:inline">
                {visible.length} widget dipilih
              </span>
              {syncStatus === "saving" && (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Kiri — katalog */}
          <div className="min-h-0 flex-1 overflow-y-auto border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            {/* Template */}
            <section className="mb-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <LayoutTemplate className="h-4 w-4 text-violet-400" />
                Template cepat
              </p>
              <div className="grid grid-cols-3 gap-3">
                {LAYOUT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:shadow-lg hover:shadow-violet-500/10"
                  >
                    <div className="mb-2 overflow-hidden rounded-lg bg-slate-900/80 p-2">
                      <LayoutSilhouettePreview
                        widgets={TEMPLATE_PREVIEW[t.id]}
                        className="!min-h-0 !border-0 !bg-transparent !p-0"
                      />
                    </div>
                    <span className="block text-xs font-semibold text-white">{t.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                      {t.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Widget grid */}
            <section className="mb-6">
              <p className="mb-3 text-sm font-semibold text-white">Pilih widget</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                {sorted.map((widget) => {
                  const isActive = widget.visible;
                  const isSel = selectedId === widget.id;
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => toggleWidget(widget.id)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200",
                        isActive
                          ? "border-indigo-500/60 bg-indigo-500/10 shadow-md shadow-indigo-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
                        isSel && "ring-2 ring-indigo-400/60 ring-offset-2 ring-offset-slate-950"
                      )}
                    >
                      {isActive && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <WidgetSilhouette type={widget.type} active={isActive} className="mb-3" />
                      <p className="truncate pr-6 text-sm font-medium text-white">
                        {widgetLabel(widget, data)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {WIDGET_DESC[widget.type]}
                      </p>
                      <span
                        className={cn(
                          "mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium",
                          isActive ? "text-indigo-300" : "text-slate-500"
                        )}
                      >
                        {isActive ? "Ditambahkan — klik untuk hapus" : (
                          <>
                            <Plus className="h-3 w-3" /> Klik untuk tambah
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selected && isChart && selected.visible && (
              <section className="mb-6 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.07] p-4">
                <p className="mb-3 text-sm font-semibold text-indigo-200">
                  Atur grafik: {widgetLabel(selected, data)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-slate-400">Bentuk</span>
                    <select
                      value={selected.chartType ?? "bar"}
                      onChange={(e) =>
                        patchWidget(selected.id, { chartType: e.target.value as ChartType })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                    >
                      {ALL_CHART_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {CHART_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-slate-400">Kelompokkan</span>
                    <select
                      value={selected.categoryKey ?? ""}
                      onChange={(e) =>
                        patchWidget(selected.id, { categoryKey: e.target.value || undefined })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                    >
                      <option value="">Otomatis</option>
                      {categoryCols.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs text-slate-400">Nilai angka</span>
                    <select
                      value={selected.valueKey ?? ""}
                      onChange={(e) =>
                        patchWidget(selected.id, { valueKey: e.target.value || undefined })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                    >
                      <option value="">Hitung jumlah baris</option>
                      {numericCols.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            )}

            <MultiSheetPanel
              layout={draft}
              sheetUrls={sheetUrls}
              onAddSheet={onAddSheet}
              onRemoveSheet={onRemoveSheet}
              onToggleMerge={onToggleMerge}
              onReloadMerged={onReloadMerged}
            />
          </div>

          {/* Kanan — preview */}
          <div className="flex w-full shrink-0 flex-col bg-slate-900/40 lg:w-[min(340px,38%)]">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Layers className="h-4 w-4 text-cyan-400" />
                Pratinjau susunan
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Siluet layout — data asli muncul setelah simpan
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Phone-style frame */}
              <div className="mx-auto max-w-[280px] rounded-[1.75rem] border border-white/15 bg-slate-950 p-3 shadow-xl shadow-black/40">
                <div className="mb-2 flex justify-center">
                  <div className="h-1 w-12 rounded-full bg-white/15" />
                </div>
                <div className="max-h-[320px] overflow-y-auto rounded-2xl bg-slate-900/80 p-3">
                  <LayoutSilhouettePreview
                    widgets={visible.map((w) => ({ id: w.id, type: w.type }))}
                    className="!min-h-[180px] !border-0 !bg-transparent !p-0"
                  />
                </div>
              </div>

              {visible.length > 0 && (
                <ul className="mt-5 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Urutan ({visible.length})
                  </p>
                  {visible.map((w, i) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-[11px] font-bold text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                        {widgetLabel(w, data)}
                      </span>
                      <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveWidget(w.id, "up")}
                          className="px-2 py-1 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === visible.length - 1}
                          onClick={() => moveWidget(w.id, "down")}
                          className="border-l border-white/10 px-2 py-1 text-slate-500 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/90 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              onReset();
              setDraft(structuredClone(layout));
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset default
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              disabled={visible.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Simpan & Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
