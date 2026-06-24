"use client";

import { useEffect, useRef, useCallback } from "react";
import { FileDown, CalendarClock } from "lucide-react";
import type { ReportScheduleInterval } from "@/lib/report-schedule";
import { cn } from "@/lib/utils";

interface ScheduledReportBarProps {
  intervalMinutes: ReportScheduleInterval;
  onIntervalChange: (minutes: ReportScheduleInterval) => void;
  onExport: () => void;
  exporting?: boolean;
  lastExportAt: Date | null;
  canExport: boolean;
}

const OPTIONS: { value: ReportScheduleInterval; label: string }[] = [
  { value: 0, label: "Mati" },
  { value: 60, label: "Per jam" },
  { value: 1440, label: "Harian" },
];

export function ScheduledReportBar({
  intervalMinutes,
  onIntervalChange,
  onExport,
  exporting,
  lastExportAt,
  canExport,
}: ScheduledReportBarProps) {
  const onExportRef = useRef(onExport);
  onExportRef.current = onExport;

  const runScheduled = useCallback(() => {
    if (canExport) onExportRef.current();
  }, [canExport]);

  useEffect(() => {
    if (!canExport || intervalMinutes === 0) return;
    const ms = intervalMinutes * 60 * 1000;
    const id = setInterval(runScheduled, ms);
    return () => clearInterval(id);
  }, [intervalMinutes, canExport, runScheduled]);

  if (!canExport) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>Export terjadwal (CSV)</span>
        <select
          value={intervalMinutes}
          onChange={(e) =>
            onIntervalChange(parseInt(e.target.value, 10) as ReportScheduleInterval)
          }
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {lastExportAt && (
          <span className="text-slate-400">
            Terakhir: {lastExportAt.toLocaleTimeString("id-ID")}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="btn-ghost py-1 text-[11px]"
      >
        <FileDown className={cn("h-3 w-3", exporting && "animate-pulse")} />
        Export sekarang
      </button>
    </div>
  );
}
