"use client";

import { useState } from "react";
import type { ChartConfig, ChartType } from "@/lib/types";
import { ALL_CHART_TYPES } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { BarChart3, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  chart: ChartConfig;
  defaultLarge?: boolean;
  className?: string;
  controlledType?: ChartType;
  onTypeChange?: (type: ChartType) => void;
  showTypePicker?: boolean;
  compactPicker?: boolean;
}

export function ChartCard({
  chart,
  defaultLarge,
  className,
  controlledType,
  onTypeChange,
  showTypePicker = true,
  compactPicker = false,
}: ChartCardProps) {
  const [internalType, setInternalType] = useState<ChartType>(chart.type);
  const [expanded, setExpanded] = useState(defaultLarge ?? false);

  const chartType = controlledType ?? internalType;
  const setChartType = onTypeChange ?? setInternalType;
  const activeChart = { ...chart, type: chartType };

  const visibleTypes = compactPicker ? ALL_CHART_TYPES.slice(0, 6) : ALL_CHART_TYPES;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/30 hover:shadow-indigo-500/10",
        expanded ? "col-span-full p-6" : "p-5",
        className
      )}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20" />

      <header className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-300/80">
              {chartType}
            </span>
            {chart.featured && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                Featured
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white">{chart.title}</h3>
          {chart.description && (
            <p className="mt-1 text-xs text-slate-400">{chart.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showTypePicker && (
            <div className="flex max-w-[220px] flex-wrap justify-end gap-0.5 rounded-lg border border-white/10 bg-slate-900/50 p-0.5 sm:max-w-none">
              {visibleTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  title={t}
                  className={cn(
                    "rounded-md px-1.5 py-1 text-[9px] font-medium capitalize transition-colors sm:px-2 sm:text-[10px]",
                    chartType === t
                      ? "bg-indigo-500/30 text-indigo-200"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {t === "horizontalBar" ? "H-Bar" : t === "stackedBar" ? "Stack" : t}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title={expanded ? "Perkecil" : "Perbesar"}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <ChartRenderer chart={activeChart} large={expanded} />
    </article>
  );
}
