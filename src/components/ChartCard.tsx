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
  onDrillDown?: (value: string) => void;
}

export function ChartCard({
  chart,
  defaultLarge,
  className,
  controlledType,
  onTypeChange,
  showTypePicker = true,
  compactPicker = false,
  onDrillDown,
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
        "surface-card transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]",
        expanded ? "col-span-full p-5 sm:p-6" : "p-4 sm:p-5",
        className
      )}
    >
      <header className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              <BarChart3 className="h-3 w-3" />
              {chartType}
            </span>
            {chart.featured && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Utama
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{chart.title}</h3>
          {chart.description && (
            <p className="mt-0.5 text-xs text-slate-500">{chart.description}</p>
          )}
          {onDrillDown && (
            <span className="text-[10px] text-slate-400">· klik segmen untuk filter</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showTypePicker && (
            <div className="flex max-w-[200px] flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:max-w-none">
              {visibleTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  title={t}
                  className={cn(
                    "rounded-md px-1.5 py-1 text-[9px] font-medium capitalize transition-colors sm:px-2 sm:text-[10px]",
                    chartType === t
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t === "horizontalBar" ? "H-Bar" : t === "stackedBar" ? "Stack" : t}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            title={expanded ? "Perkecil" : "Perbesar"}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <ChartRenderer chart={activeChart} large={expanded} onDrillDown={onDrillDown} />
    </article>
  );
}
