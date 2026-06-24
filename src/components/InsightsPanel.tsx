import type { InsightItem } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  highlight: Sparkles,
};

const STYLES = {
  info: "border-l-cyan-500",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  highlight: "border-l-indigo-500",
};

const ICON_COLORS = {
  info: "text-cyan-600",
  success: "text-emerald-600",
  warning: "text-amber-600",
  highlight: "text-indigo-600",
};

interface InsightsPanelProps {
  insights: InsightItem[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div>
      <SectionHeader
        title="Insight Otomatis"
        description="Ringkasan analisis dari pola data di sheet Anda"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, i) => {
          const Icon = ICONS[insight.type];
          return (
            <article
              key={insight.id}
              className={cn(
                "surface-card animate-fade-in-up border-l-[3px] p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]",
                STYLES[insight.type],
                `stagger-${Math.min(i + 1, 6)}`
              )}
            >
              <div className="flex gap-3">
                <div className={cn("mt-0.5 shrink-0", ICON_COLORS[insight.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3>
                    {insight.metric && (
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {insight.description}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
