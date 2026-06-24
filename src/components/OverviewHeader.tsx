"use client";

import { Columns3, LayoutGrid, Rows3, Sparkles } from "lucide-react";
import type { SheetData } from "@/lib/types";
import { formatNumber } from "@/lib/format";
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
  const updated = data.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const stats = [
    { icon: Rows3, label: `${formatNumber(data.rows.length)} baris` },
    { icon: Columns3, label: `${data.columns.length} kolom` },
    { icon: LayoutGrid, label: `${widgetCount} widget` },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-950/40 to-slate-900/80 p-5 sm:p-6",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-indigo-300">
            <Sparkles className="h-3 w-3" />
            Overview
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Ringkasan Data
          </h2>
          <p className="mt-1 max-w-lg text-sm text-slate-400">
            {mergeMode && sheetCount > 1
              ? `Gabungan ${sheetCount} sheet · dashboard kustom Anda`
              : "Dashboard interaktif dari Google Sheet — atur tampilan sesuai kebutuhan"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {stats.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
            >
              <Icon className="h-3.5 w-3.5 text-indigo-400" />
              {label}
            </div>
          ))}
          {updated && (
            <div className="flex items-center rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2 text-[10px] text-slate-500">
              Diperbarui {updated}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
