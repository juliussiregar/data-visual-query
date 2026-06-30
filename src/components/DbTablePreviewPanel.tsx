"use client";

import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TablePreviewData {
  columns: string[];
  rows: Record<string, string>[];
}

const PREVIEW_MAX_COLUMNS = 8;

interface DbTablePreviewPanelProps {
  tableLabel: string;
  loading?: boolean;
  error?: string | null;
  data?: TablePreviewData | null;
  onClose: () => void;
}

export function DbTablePreviewPanel({
  tableLabel,
  loading,
  error,
  data,
  onClose,
}: DbTablePreviewPanelProps) {
  const visibleColumns = data?.columns.slice(0, PREVIEW_MAX_COLUMNS) ?? [];
  const hiddenColumnCount = Math.max(0, (data?.columns.length ?? 0) - visibleColumns.length);

  return (
    <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-800">{tableLabel}</p>
          {data && !loading && !error ? (
            <p className="mt-0.5 text-[10px] text-slate-500">
              {data.columns.length} kolom
              {data.rows.length === 0
                ? " · tabel kosong"
                : ` · contoh ${data.rows.length} baris`}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Tutup preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-3 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Memuat preview…
        </p>
      ) : error ? (
        <p className="py-2 text-[11px] text-red-600">{error}</p>
      ) : data ? (
        <div className="space-y-2">
          {data.rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-[11px] text-slate-500">
              Tabel kosong — belum ada baris data.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-600"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {visibleColumns.map((column) => (
                        <td
                          key={column}
                          className="max-w-[140px] truncate whitespace-nowrap px-2 py-1.5 text-slate-700"
                          title={row[column] ?? ""}
                        >
                          {row[column] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hiddenColumnCount > 0 && (
            <p className="text-[10px] text-slate-400">
              +{hiddenColumnCount} kolom lainnya tidak ditampilkan
            </p>
          )}

          {data.columns.length > 0 && data.rows.length > 0 && (
            <p className={cn("text-[10px] leading-relaxed text-slate-400")}>
              Kolom: {data.columns.join(", ")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
