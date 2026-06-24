"use client";

import {
  Database,
  ExternalLink,
  Layers,
  ShieldAlert,
  Table2,
} from "lucide-react";
import type { DatasetMeta } from "@/lib/types";
import { schemaSummary } from "@/lib/schema-registry";
import { formatNumber } from "@/lib/format";
import { DataFreshnessBadge } from "./DataFreshnessBadge";
import { cn } from "@/lib/utils";

interface DatasetCatalogPanelProps {
  dataset: DatasetMeta;
  className?: string;
}

export function DatasetCatalogPanel({ dataset, className }: DatasetCatalogPanelProps) {
  const { profile, freshness } = dataset;
  const displayRows = profile.filteredRowCount ?? profile.rowCount;

  const stats = [
    {
      icon: Table2,
      label: "Baris",
      value:
        profile.filteredRowCount != null
          ? `${formatNumber(profile.filteredRowCount)} / ${formatNumber(profile.rowCount)}`
          : formatNumber(displayRows),
      hint: profile.filteredRowCount != null ? "filter aktif" : "total",
    },
    {
      icon: Layers,
      label: "Kolom",
      value: String(profile.columnCount),
      hint: `${profile.dimensionCount} dim · ${profile.measureCount} measure`,
    },
    {
      icon: ShieldAlert,
      label: "Sensitif",
      value: String(profile.sensitiveFieldCount),
      hint: "field PII",
    },
  ];

  return (
    <section className={cn("surface-section p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="badge badge-primary">
              <Database className="h-3 w-3" />
              Data Source
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">
              {schemaSummary(profile.columnCount, profile.dimensionCount, profile.measureCount)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">
              {dataset.sourceType === "merged"
                ? "Multi-sheet"
                : dataset.sourceType === "postgresql"
                  ? "PostgreSQL"
                  : "Google Sheets"}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-slate-900">{dataset.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Null rate {profile.nullCellRate}% · refresh SLA {freshness.staleThresholdMinutes / 60}j
            {dataset.lineageSummary && ` · ${dataset.lineageSummary}`}
            {dataset.quality != null && ` · kualitas ${dataset.quality.score}/100`}
          </p>

          {dataset.sourceUrl.startsWith("http") && (
          <a
            href={dataset.sourceUrl.split(" | ")[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Buka sumber
            <ExternalLink className="h-3 w-3" />
          </a>
          )}
        </div>

        <DataFreshnessBadge status={freshness.status} label={freshness.label} className="lg:max-w-xs" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="surface-card px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value}</p>
            <p className="text-[10px] text-slate-400">{hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
