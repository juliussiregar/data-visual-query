"use client";

import { X, Filter } from "lucide-react";
import type { ColumnMeta } from "@/lib/types";
import type { Filters } from "@/lib/filters";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  columns: ColumnMeta[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  rows: Record<string, string>[];
  totalRows: number;
}

export function FilterBar({ columns, filters, onChange, rows, totalRows }: FilterBarProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const filteredCount = (() => {
    const active = Object.entries(filters).filter(([, v]) => v);
    if (active.length === 0) return rows.length;
    return rows.filter((row) =>
      active.every(([key, value]) => row[key]?.trim() === value)
    ).length;
  })();

  const clearAll = () => onChange({});

  const getOptions = (key: string) => {
    const values = new Set<string>();
    for (const row of rows) {
      const v = row[key]?.trim();
      if (v) values.add(v);
    }
    return [...values].sort();
  };

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-900">Filter</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-slate-500">
            {filteredCount.toLocaleString("id-ID")} / {totalRows.toLocaleString("id-ID")} baris
          </span>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.slice(0, 5).map((col) => (
          <select
            key={col.key}
            value={filters[col.key] ?? ""}
            onChange={(e) =>
              onChange({ ...filters, [col.key]: e.target.value || "" })
            }
            className={cn(
              "rounded-lg border bg-white px-3 py-2 text-xs text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
              filters[col.key]
                ? "border-indigo-300 font-medium text-indigo-700"
                : "border-slate-200"
            )}
          >
            <option value="">{col.label}: Semua</option>
            {getOptions(col.key).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
