"use client";

import { useState, type ReactNode } from "react";
import type { ChartConfig, ChartType } from "@/lib/types";
import { ALL_CHART_TYPES } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { aggregationLabel, chartTypeLabel } from "@/lib/chart-labels";
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
  /** select = dropdown (gallery); chips = compact buttons (overview widgets) */
  pickerStyle?: "select" | "chips";
  onDrillDown?: (value: string) => void;
  /** Tombol aksi tambahan di header (mis. Edit di overview widget) */
  headerActions?: ReactNode;
}

export function ChartCard({
  chart,
  defaultLarge,
  className,
  controlledType,
  onTypeChange,
  showTypePicker = true,
  compactPicker = false,
  pickerStyle = "select",
  onDrillDown,
  headerActions,
}: ChartCardProps) {
  const [internalType, setInternalType] = useState<ChartType>(chart.type);
  const [expanded, setExpanded] = useState(defaultLarge ?? false);

  const chartType = controlledType ?? internalType;
  const setChartType = onTypeChange ?? setInternalType;
  const activeChart = { ...chart, type: chartType };
  const useChips = compactPicker || pickerStyle === "chips";
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
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              <BarChart3 className="h-3 w-3" />
              {chartTypeLabel(chartType)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {aggregationLabel(chart.aggregation)}
            </span>
            {chart.featured && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Featured
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{chart.title}</h3>
          {chart.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{chart.description}</p>
          )}
          {onDrillDown && (
            <p className="mt-1 text-[11px] text-slate-400">Click a segment to filter the data table</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {showTypePicker &&
            (useChips ? (
              <div className="flex max-w-full flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {visibleTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    title={chartTypeLabel(t)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      chartType === t
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {t === "horizontalBar" ? "H-bar" : t === "stackedBar" ? "Stack" : t}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                aria-label="Chart type"
              >
                {ALL_CHART_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {chartTypeLabel(t)}
                  </option>
                ))}
              </select>
            ))}
          {headerActions}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            title={expanded ? "Collapse" : "Expand"}
            aria-label={expanded ? "Collapse chart" : "Expand chart"}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <ChartRenderer chart={activeChart} large={expanded} onDrillDown={onDrillDown} />
    </article>
  );
}
