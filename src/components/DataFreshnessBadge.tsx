"use client";

import { Clock, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { FreshnessStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  FreshnessStatus,
  { icon: typeof CheckCircle2; className: string; dot: string }
> = {
  healthy: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  warning: {
    icon: Clock,
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  critical: {
    icon: AlertTriangle,
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  unknown: {
    icon: HelpCircle,
    className: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  },
};

interface DataFreshnessBadgeProps {
  status: FreshnessStatus;
  label: string;
  compact?: boolean;
  className?: string;
}

export function DataFreshnessBadge({
  status,
  label,
  compact,
  className,
}: DataFreshnessBadgeProps) {
  const config = STATUS_STYLES[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium",
          config.className,
          className
        )}
        title={label}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
        {status === "healthy" ? "Segar" : status === "warning" ? "Perlu refresh" : status === "critical" ? "Tertinggal" : "Unknown"}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
        config.className,
        className
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="leading-relaxed">{label}</span>
    </div>
  );
}
