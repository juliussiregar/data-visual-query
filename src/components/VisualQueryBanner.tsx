"use client";

import { Search, X, Pencil } from "lucide-react";
import { visualQuerySummary, type VisualQuery } from "@/lib/visual-query";
import type { ColumnMeta } from "@/lib/types";

interface VisualQueryBannerProps {
  query: VisualQuery;
  columns: ColumnMeta[];
  rowCount: number;
  totalRows: number;
  onEdit: () => void;
  onClear: () => void;
}

export function VisualQueryBanner({
  query,
  columns,
  rowCount,
  totalRows,
  onEdit,
  onClear,
}: VisualQueryBannerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Search className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <p className="text-xs font-semibold text-indigo-900">Filter Cari Data aktif</p>
          <p className="mt-0.5 text-[11px] text-indigo-700">{visualQuerySummary(query, columns)}</p>
          <p className="mt-1 text-[10px] text-indigo-600/80">
            {rowCount.toLocaleString("id-ID")} / {totalRows.toLocaleString("id-ID")} baris
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="btn-ghost py-1.5 text-[11px]">
          <Pencil className="h-3 w-3" />
          Ubah
        </button>
        <button type="button" onClick={onClear} className="btn-ghost py-1.5 text-[11px]">
          <X className="h-3 w-3" />
          Hapus filter
        </button>
      </div>
    </div>
  );
}
