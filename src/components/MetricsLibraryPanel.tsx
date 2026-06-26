"use client";

import { useState } from "react";
import { Calculator, Sigma, Sparkles, Plus, BadgeCheck, Trash2 } from "lucide-react";
import type { MetricDefinition, MetricValues } from "@/lib/types";
import type { SavedMetric } from "@/lib/metrics-storage";
import { formatDynamicMetricValue } from "@/lib/generic-metrics";
import { createCustomMetric } from "@/lib/saved-metrics";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

interface MetricsLibraryPanelProps {
  metrics: MetricDefinition[];
  values?: MetricValues;
  savedMetrics?: SavedMetric[];
  canCertify?: boolean;
  onSaveMetric?: (metric: SavedMetric) => void;
  onCertifyMetric?: (id: string) => void;
  onRemoveMetric?: (id: string) => void;
  className?: string;
}

export function MetricsLibraryPanel({
  metrics,
  values,
  savedMetrics = [],
  canCertify = false,
  onSaveMetric,
  onCertifyMetric,
  onRemoveMetric,
  className,
}: MetricsLibraryPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("SUM(Outstanding)");

  if (metrics.length === 0 && savedMetrics.length === 0) return null;

  const handleCreate = () => {
    if (!name.trim() || !formula.trim() || !onSaveMetric) return;
    onSaveMetric(createCustomMetric(name.trim(), formula.trim(), "auto"));
    setName("");
    setFormula("SUM(Outstanding)");
    setShowForm(false);
  };

  const allMetrics = metrics;

  return (
    <section className={cn("surface-section p-4 sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <SectionHeader
          title="Metrics"
          description={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              {allMetrics.length} metric · {savedMetrics.length} tersimpan
            </span>
          }
          className="border-none pb-0"
        />
        {onSaveMetric && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3 w-3" />
            Metric baru
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
          <p className="mb-2 text-xs font-medium text-slate-700">Metric kustom</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama metric"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="SUM(Kolom) atau A + B"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white"
            >
              Simpan
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Didukung: COUNT(*), SUM(col), AVG(col), MIN/MAX(col), ekspresi multi-kolom (A + B + C), colA / colB
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allMetrics.map((metric) => {
          const current = formatDynamicMetricValue(metric.id, values);
          const TypeIcon = metric.type === "calculated_field" ? Calculator : Sigma;
          const isSaved = savedMetrics.some((s) => s.id === metric.id);
          const isCertified = metric.status === "certified";

          return (
            <article key={metric.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <h4 className="truncate text-sm font-semibold text-slate-900">{metric.name}</h4>
                  </div>
                  {metric.description && (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {metric.description}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "badge shrink-0 normal-case tracking-normal",
                    isCertified
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  {isCertified ? "Certified" : isSaved ? "Saved" : "Auto"}
                </span>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100">
                <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                  {metric.formula}
                </p>
              </div>

              {current && (
                <p className="mt-2.5 text-sm font-semibold tabular-nums text-slate-900">
                  {current}
                </p>
              )}

              <div className="mt-2 flex gap-2">
                {canCertify && onCertifyMetric && metric.status !== "certified" && isSaved && (
                  <button
                    type="button"
                    onClick={() => onCertifyMetric(metric.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-800"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Certify
                  </button>
                )}
                {isSaved && onRemoveMetric && (
                  <button
                    type="button"
                    onClick={() => onRemoveMetric(metric.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
