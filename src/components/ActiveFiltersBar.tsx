"use client";

import { Filter, X } from "lucide-react";
import type { ColumnMeta } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ActiveFiltersBarProps {
  filters: Record<string, string>;
  columns: ColumnMeta[];
  rowCount?: number;
  onRemove: (columnKey: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({
  filters,
  columns,
  rowCount,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersBarProps) {
  const entries = Object.entries(filters).filter(([, value]) => value.trim());

  if (entries.length === 0) return null;

  const labelFor = (key: string) =>
    columns.find((c) => c.key === key)?.label ?? key;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-3 py-2.5",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-800">
        <Filter className="h-3.5 w-3.5 shrink-0" />
        Active filters
      </span>

      {entries.map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => onRemove(key)}
          className="inline-flex max-w-[14rem] items-center gap-1 truncate rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-800 shadow-sm hover:bg-indigo-50"
          title={`Remove filter ${labelFor(key)} = ${value}`}
        >
          <span className="truncate">
            {labelFor(key)} = {value}
          </span>
          <X className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      ))}

      {rowCount != null && (
        <span className="text-[11px] text-indigo-600">
          {formatNumber(rowCount)} rows
        </span>
      )}

      {entries.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
