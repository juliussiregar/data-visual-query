"use client";

import { AlertTriangle, Clock, RefreshCw, X } from "lucide-react";
import type { FreshnessStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DataFreshnessAlertProps {
  status: FreshnessStatus;
  label: string;
  onRefresh?: () => void;
  onDismiss: () => void;
  className?: string;
}

export function DataFreshnessAlert({
  status,
  label,
  onRefresh,
  onDismiss,
  className,
}: DataFreshnessAlertProps) {
  if (status === "healthy" || status === "unknown") return null;

  const isCritical = status === "critical";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs",
        isCritical
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-900",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        {isCritical ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        ) : (
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-semibold">
            {isCritical ? "Data perlu segera di-refresh" : "Data mulai tertinggal"}
          </p>
          <p className="mt-0.5 opacity-90">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium",
              isCritical
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-amber-600 text-white hover:bg-amber-500"
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh sheet
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 opacity-70 hover:opacity-100"
          aria-label="Tutup peringatan"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
