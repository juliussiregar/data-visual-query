import type { KpiMetric } from "@/lib/types";
import {
  Activity,
  BarChart2,
  Hash,
  TrendingUp,
  Users,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  hash: Hash,
  trending: TrendingUp,
  activity: Activity,
  chart: BarChart2,
  users: Users,
  wallet: Wallet,
};

const ACCENT_STRIPES = [
  "accent-stripe-indigo",
  "accent-stripe-violet",
  "accent-stripe-cyan",
  "accent-stripe-emerald",
  "accent-stripe-amber",
  "accent-stripe-rose",
];

const ICON_THEMES = [
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-cyan-50 text-cyan-600",
  "bg-emerald-50 text-emerald-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
];

interface KPICardsProps {
  metrics: KpiMetric[];
}

export function KPICards({ metrics }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric, index) => {
        const Icon = ICON_MAP[metric.icon ?? "hash"] ?? Hash;
        const stripe = ACCENT_STRIPES[index % ACCENT_STRIPES.length];
        const iconTheme = ICON_THEMES[index % ICON_THEMES.length];

        return (
          <div
            key={metric.id}
            className={cn(
              "surface-card animate-fade-in-up pl-4 pr-4 py-4 transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]",
              stripe,
              `stagger-${Math.min(index + 1, 6)}`
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">
                  {metric.value}
                </p>
                {metric.sublabel && (
                  <p
                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"
                    title={metric.formula}
                  >
                    {metric.trend === "up" && (
                      <ArrowUpRight className="h-3 w-3 shrink-0 text-emerald-500" />
                    )}
                    {metric.trend === "down" && (
                      <ArrowUpRight className="h-3 w-3 shrink-0 rotate-90 text-amber-500" />
                    )}
                    <span className="truncate">{metric.sublabel}</span>
                  </p>
                )}
              </div>
              <div className={cn("rounded-lg p-2", iconTheme)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
