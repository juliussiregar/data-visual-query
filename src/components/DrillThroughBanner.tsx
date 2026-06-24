"use client";

import { Filter, Table2, X } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface DrillThroughBannerProps {
  columnLabel: string;
  value: string;
  rowCount?: number;
  onClear: () => void;
  onViewData?: () => void;
}

export function DrillThroughBanner({
  columnLabel,
  value,
  rowCount,
  onClear,
  onViewData,
}: DrillThroughBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-indigo-800">
        <span className="inline-flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 shrink-0" />
          <span>
            Drill-through: <strong>{columnLabel}</strong> = <strong>{value}</strong>
          </span>
        </span>
        {rowCount != null && (
          <span className="text-indigo-600">
            {formatNumber(rowCount)} baris cocok
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onViewData && (
          <button
            type="button"
            onClick={onViewData}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-500"
          >
            <Table2 className="h-3 w-3" />
            Lihat tabel
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
        >
          <X className="h-3 w-3" />
          Hapus
        </button>
      </div>
    </div>
  );
}
