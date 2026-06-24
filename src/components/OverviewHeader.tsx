"use client";

import { Columns3, LayoutGrid, Rows3 } from "lucide-react";
import type { SheetData } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import { cn } from "@/lib/utils";

interface OverviewHeaderProps {
  data: SheetData;
  widgetCount: number;
  mergeMode?: boolean;
  sheetCount?: number;
  className?: string;
}

export function OverviewHeader({
  data,
  widgetCount,
  mergeMode,
  sheetCount = 1,
  className,
}: OverviewHeaderProps) {
  const dataset = data.dataset;
  const title = dataset?.name ?? "Ringkasan Data";
  const subtitle =
    mergeMode && sheetCount > 1
      ? `Gabungan ${sheetCount} sheet · tampilan kustom`
      : dataset
        ? `${dataset.profile.dimensionCount} dimensi · ${dataset.profile.measureCount} measure · ${dataset.profile.sensitiveFieldCount} field sensitif`
        : "Dashboard otomatis dari struktur kolom sheet Anda";

  const stats = [
    { icon: Rows3, label: "Baris", value: formatNumber(data.rows.length) },
    { icon: Columns3, label: "Kolom", value: String(data.columns.length) },
    { icon: LayoutGrid, label: "Widget", value: String(widgetCount) },
  ];

  return (
    <div className={cn("surface-card p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-600">Overview</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">{subtitle}</p>
        </div>

        {dataset && (
          <DataFreshnessBadge
            status={dataset.freshness.status}
            label={dataset.freshness.label}
            compact
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-1.5 sm:justify-start">
              <Icon className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {label}
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
