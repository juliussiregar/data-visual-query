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

const GRADIENTS = [
  "from-indigo-500/20 via-indigo-600/10 to-transparent",
  "from-violet-500/20 via-violet-600/10 to-transparent",
  "from-cyan-500/20 via-cyan-600/10 to-transparent",
  "from-emerald-500/20 via-emerald-600/10 to-transparent",
  "from-amber-500/20 via-amber-600/10 to-transparent",
  "from-rose-500/20 via-rose-600/10 to-transparent",
];

interface KPICardsProps {
  metrics: KpiMetric[];
}

export function KPICards({ metrics }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric, index) => {
        const Icon = ICON_MAP[metric.icon ?? "hash"] ?? Hash;
        return (
          <div
            key={metric.id}
            className={cn(
              "glass-card animate-fade-in-up relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-xl hover:shadow-indigo-500/5",
              `stagger-${Math.min(index + 1, 6)}`
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                GRADIENTS[index % GRADIENTS.length]
              )}
            />
            <div className="relative flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-2 truncate text-xl font-bold tracking-tight text-white lg:text-2xl">
                  {metric.value}
                </p>
                {metric.sublabel && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    {metric.trend === "up" && (
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    )}
                    {metric.sublabel}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
                <Icon className="h-5 w-5 text-white/80" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
