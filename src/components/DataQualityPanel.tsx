"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { DataQualityReport } from "@/lib/types";
import { qualityScoreLabel } from "@/lib/data-quality";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

interface DataQualityPanelProps {
  report: DataQualityReport;
  className?: string;
}

const SEVERITY_STYLE = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

export function DataQualityPanel({ report, className }: DataQualityPanelProps) {
  const scoreColor =
    report.score >= 85
      ? "text-emerald-600"
      : report.score >= 65
        ? "text-amber-600"
        : "text-red-600";

  return (
    <section className={cn("surface-section p-4 sm:p-5", className)}>
      <SectionHeader
        title="Kualitas Data"
        description="Aturan validasi otomatis pada dataset aktif"
        className="mb-4 border-none pb-0"
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="surface-card flex items-center gap-3 px-4 py-3">
          <div className={cn("text-2xl font-bold tabular-nums", scoreColor)}>
            {report.score}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900">
              Skor kualitas · {qualityScoreLabel(report.score)}
            </p>
            <p className="text-[10px] text-slate-500">
              {report.issueCount} temuan
              {report.criticalCount > 0 && ` · ${report.criticalCount} kritis`}
            </p>
          </div>
        </div>
        {report.score >= 85 && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Siap untuk analisis
          </span>
        )}
      </div>

      {report.issues.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada masalah kualitas terdeteksi.</p>
      ) : (
        <div className="space-y-2">
          {report.issues.map((issue) => (
            <div
              key={issue.id}
              className={cn(
                "flex gap-2 rounded-lg border px-3 py-2.5 text-xs",
                SEVERITY_STYLE[issue.severity]
              )}
            >
              {issue.severity === "info" ? (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <div>
                <p className="font-semibold">{issue.title}</p>
                <p className="mt-0.5 opacity-90">{issue.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
