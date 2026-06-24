import type { ColumnMeta, ColumnType, SemanticRole } from "@/lib/types";
import { SEMANTIC_ROLE_LABELS } from "@/lib/dataset-catalog";
import { Hash, Type, Calendar, Tags, ShieldAlert, Fingerprint, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const TYPE_CONFIG: Record<
  ColumnType,
  { icon: typeof Hash; label: string; color: string }
> = {
  number: { icon: Hash, label: "Numerik", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  category: { icon: Tags, label: "Kategori", color: "text-violet-700 bg-violet-50 border-violet-200" },
  text: { icon: Type, label: "Teks", color: "text-slate-600 bg-slate-50 border-slate-200" },
  date: { icon: Calendar, label: "Tanggal", color: "text-amber-700 bg-amber-50 border-amber-200" },
};

const ROLE_CONFIG: Record<
  SemanticRole,
  { icon: typeof Tags; color: string }
> = {
  dimension: { icon: Tags, color: "text-violet-700 bg-violet-50 border-violet-200" },
  measure: { icon: Hash, color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  date: { icon: Calendar, color: "text-amber-700 bg-amber-50 border-amber-200" },
  identifier: { icon: Fingerprint, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  sensitive: { icon: ShieldAlert, color: "text-rose-700 bg-rose-50 border-rose-200" },
  information: { icon: Info, color: "text-slate-600 bg-slate-50 border-slate-200" },
};

interface ColumnInsightsProps {
  columns: ColumnMeta[];
}

export function ColumnInsights({ columns }: ColumnInsightsProps) {
  return (
    <div>
      <SectionHeader
        title="Profil Kolom"
        description="Tipe data, peran bisnis (dimension/measure), dan kelengkapan tiap field"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col, i) => {
          const config = TYPE_CONFIG[col.type];
          const Icon = config.icon;
          const role = col.semanticRole ?? "information";
          const roleConfig = ROLE_CONFIG[role];
          const RoleIcon = roleConfig.icon;

          return (
            <article
              key={col.key}
              className={cn(
                "surface-card animate-fade-in-up p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]",
                `stagger-${Math.min(i + 1, 6)}`
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">
                    {col.businessLabel ?? col.label}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">{col.key}</p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium",
                    config.color
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                    roleConfig.color
                  )}
                >
                  <RoleIcon className="h-3 w-3" />
                  {SEMANTIC_ROLE_LABELS[role]}
                </span>
                {col.sensitive && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                    <ShieldAlert className="h-3 w-3" />
                    PII
                  </span>
                )}
              </div>

              {col.lineage && (
                <p className="mt-2 text-[10px] text-indigo-600" title={col.lineage.note}>
                  Lineage: {col.lineage.sourceLabel} · {col.lineage.sourceField}
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Unik</p>
                  <p className="text-lg font-bold text-slate-900">{col.uniqueCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Fill</p>
                  <p className="text-lg font-bold text-slate-900">{col.fillRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Null</p>
                  <p className="text-lg font-bold text-slate-900">{col.nullCount ?? 0}</p>
                </div>
              </div>

              {col.duplicateCount != null && col.duplicateCount > 0 && (
                <p className="mt-2 text-[10px] text-amber-400">
                  {col.duplicateCount} nilai duplikat pada identifier
                </p>
              )}

              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      col.fillRate >= 80
                        ? "bg-emerald-500"
                        : col.fillRate >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                    )}
                    style={{ width: `${col.fillRate}%` }}
                  />
                </div>
              </div>

              {col.sampleValues.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {col.sampleValues.slice(0, 3).map((v) => (
                    <span
                      key={v}
                      className="max-w-full truncate rounded-md bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {col.sensitive ? "••••••" : v}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
