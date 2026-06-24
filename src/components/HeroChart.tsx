import type { ChartConfig } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { MousePointerClick } from "lucide-react";

interface HeroChartProps {
  chart: ChartConfig | undefined;
  onDrillDown?: (value: string) => void;
}

export function HeroChart({ chart, onDrillDown }: HeroChartProps) {
  if (!chart) return null;

  return (
    <div className="surface-card h-full p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-600">
            Grafik Utama
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900 sm:text-lg">
            {chart.title}
          </h3>
        </div>
        {onDrillDown && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
            <MousePointerClick className="h-3 w-3" />
            Klik untuk filter
          </span>
        )}
      </div>

      <ChartRenderer chart={chart} large onDrillDown={onDrillDown} />
    </div>
  );
}
