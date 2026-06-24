"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { DataAlert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STYLES = {
  info: "border-slate-200 bg-slate-50 text-slate-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

interface DataAlertsPanelProps {
  alerts: DataAlert[];
  onRefresh?: () => void;
  className?: string;
}

export function DataAlertsPanel({ alerts, onRefresh, className }: DataAlertsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              criticalCount > 0 ? "text-red-600" : warningCount > 0 ? "text-amber-600" : "text-slate-500"
            )}
          />
          <span className="text-sm font-medium text-slate-900">
            {alerts.length} peringatan data
          </span>
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              {criticalCount} kritis
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex gap-2 rounded-lg border px-3 py-2.5 text-xs",
                STYLES[alert.severity]
              )}
            >
              {alert.severity === "info" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-0.5 leading-relaxed opacity-90">{alert.description}</p>
                {alert.id === "stale-data" && onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-2 rounded-md bg-white/80 px-2 py-1 font-medium shadow-sm ring-1 ring-black/5 hover:bg-white"
                  >
                    Refresh sheet
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
