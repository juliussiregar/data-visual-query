"use client";

import { RefreshCw, Clock } from "lucide-react";
import type { AutoRefreshInterval } from "@/hooks/useAutoRefresh";
import { cn } from "@/lib/utils";

interface AutoRefreshBarProps {
  intervalMinutes: AutoRefreshInterval;
  onIntervalChange: (minutes: AutoRefreshInterval) => void;
  lastRefreshAt: Date | null;
  refreshing: boolean;
  onRefreshNow: () => void;
}

const OPTIONS: { value: AutoRefreshInterval; label: string }[] = [
  { value: 0, label: "Mati" },
  { value: 5, label: "5 menit" },
  { value: 15, label: "15 menit" },
  { value: 30, label: "30 menit" },
];

export function AutoRefreshBar({
  intervalMinutes,
  onIntervalChange,
  lastRefreshAt,
  refreshing,
  onRefreshNow,
}: AutoRefreshBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>Auto-refresh</span>
        <select
          value={intervalMinutes}
          onChange={(e) =>
            onIntervalChange(parseInt(e.target.value, 10) as AutoRefreshInterval)
          }
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {lastRefreshAt && (
          <span className="text-slate-400">
            Terakhir: {lastRefreshAt.toLocaleTimeString("id-ID")}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRefreshNow}
        disabled={refreshing}
        className="btn-ghost py-1 text-[11px]"
      >
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        Refresh sekarang
      </button>
    </div>
  );
}
