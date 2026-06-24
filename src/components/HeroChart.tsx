import type { ChartConfig } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { Sparkles } from "lucide-react";

interface HeroChartProps {
  chart: ChartConfig | undefined;
}

export function HeroChart({ chart }: HeroChartProps) {
  if (!chart) return null;

  return (
    <div className="glass-card relative h-full overflow-hidden rounded-2xl p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/80">
            Grafik Utama
          </p>
          <h3 className="text-lg font-semibold text-white">{chart.title}</h3>
        </div>
      </div>

      <ChartRenderer chart={chart} large />
    </div>
  );
}
