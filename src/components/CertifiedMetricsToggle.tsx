"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CertifiedMetricsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export function CertifiedMetricsToggle({
  enabled,
  onChange,
  className,
}: CertifiedMetricsToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[11px] shadow-sm transition-colors",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/80 bg-white text-slate-600",
        className
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
      />
      <BadgeCheck className="h-3.5 w-3.5" />
      <span>AI: certified metrics only</span>
    </label>
  );
}
