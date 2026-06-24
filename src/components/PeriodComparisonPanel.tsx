"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { PeriodDelta } from "@/lib/period-comparison";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PeriodComparisonPanelProps {
  periodColumn: string;
  deltas: PeriodDelta[];
  className?: string;
}

export function PeriodComparisonPanel({
  periodColumn,
  deltas,
  className,
}: PeriodComparisonPanelProps) {
  if (deltas.length === 0) return null;

  return (
    <section className={cn("surface-section p-4 sm:p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Perbandingan Periode</h3>
        <p className="text-[11px] text-slate-500">
          Delta berdasarkan kolom <span className="font-mono">{periodColumn}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {deltas.map((d) => {
          const TrendIcon =
            d.delta > 0 ? TrendingUp : d.delta < 0 ? TrendingDown : Minus;
          const trendColor =
            d.delta > 0 ? "text-emerald-600" : d.delta < 0 ? "text-red-600" : "text-slate-400";

          return (
            <article key={d.measureKey} className="surface-card p-4">
              <p className="text-[11px] font-medium text-slate-500">{d.measureLabel}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                {formatNumber(d.currentValue)}
              </p>
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>
                  {d.deltaPercent >= 0 ? "+" : ""}
                  {d.deltaPercent.toFixed(1)}%
                </span>
                <span className="text-slate-400 font-normal">
                  vs {d.previousPeriod}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {d.currentPeriod}: {formatNumber(d.currentValue)} · {d.previousPeriod}:{" "}
                {formatNumber(d.previousValue)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
