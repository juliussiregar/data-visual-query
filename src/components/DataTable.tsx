"use client";

import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Download, List } from "lucide-react";
import type { ColumnMeta } from "@/lib/types";
import { maskValue } from "@/lib/pii-mask";
import { cn } from "@/lib/utils";

interface DataTableProps {
  rows: Record<string, string>[];
  columns: ColumnMeta[];
  maskPII?: boolean;
  canExport?: boolean;
  drillFilter?: { column: string; value: string; columnLabel?: string };
  compact?: boolean;
  /** Rows per page when pagination is on. Ignored when pagination is off. */
  pageSize?: number;
  /** Use full container width — no forced min-width or narrow cell caps (dashboard widgets). */
  fitContainer?: boolean;
  /** Max columns to render; 0 = show all passed columns. */
  maxColumns?: number;
  /** off = show all rows; optional = all by default, user can enable pagination */
  paginationMode?: "off" | "optional" | "on";
  /** Summary row values keyed by column (table widget footer). */
  summaryRow?: Record<string, string>;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];

function statusBadge(value: string): string {
  const s = value.toLowerCase();
  if (s.includes("akad")) return "bg-emerald-100 text-emerald-700 ring-emerald-500/20";
  if (s.includes("cancel") || s.includes("batal")) return "bg-red-500/15 text-red-600 ring-red-500/20";
  if (s.includes("progress")) return "bg-amber-500/15 text-amber-700 ring-amber-500/20";
  if (s.includes("sp3k")) return "bg-indigo-50 text-indigo-600 ring-indigo-500/20";
  if (s.includes("belum")) return "bg-orange-500/15 text-orange-300 ring-orange-500/20";
  if (s === "ya") return "bg-emerald-100 text-emerald-700 ring-emerald-500/20";
  if (s === "tidak") return "bg-slate-500/15 text-slate-400 ring-slate-500/20";
  return "";
}

function isBadgeColumn(key: string): boolean {
  return /status|prioritas|priority/i.test(key);
}

function renderCellValue(
  raw: string,
  col: ColumnMeta,
  maskPII: boolean,
  fitContainer: boolean,
  bold = false
) {
  const val =
    maskPII && col.sensitive && raw !== "—" && raw !== ""
      ? maskValue(raw, true)
      : raw || "—";
  const badge = isBadgeColumn(col.key) && val !== "—";

  if (badge) {
    return (
      <span
        className={cn(
          "inline-block truncate rounded-md px-2 py-0.5 text-xs font-medium ring-1",
          statusBadge(val) || "bg-slate-50 text-slate-600 ring-slate-200",
          bold && "font-semibold"
        )}
      >
        {val}
      </span>
    );
  }

  return (
    <span
      className={cn(
        bold ? "font-semibold text-indigo-900" : "text-slate-600",
        fitContainer ? "whitespace-nowrap" : "block truncate"
      )}
    >
      {val}
    </span>
  );
}

export function DataTable({
  rows,
  columns,
  maskPII = false,
  canExport = true,
  drillFilter,
  compact = false,
  pageSize: defaultPageSize = 50,
  fitContainer = false,
  maxColumns = 0,
  paginationMode = compact ? "off" : "optional",
  summaryRow,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [paginationOn, setPaginationOn] = useState(paginationMode === "on");
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const paginate =
    paginationMode === "on" || (paginationMode === "optional" && paginationOn);

  const displayColumns = useMemo(() => {
    const valid = columns.filter((c) => c.key.trim());
    if (maxColumns === 0) return valid;
    return valid.slice(0, maxColumns);
  }, [columns, maxColumns]);

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => v.toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = av.localeCompare(bv, "id", { numeric: true });
        return sortAsc ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, sortKey, sortAsc]);

  const effectivePageSize = paginate ? pageSize : filtered.length || 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = paginate
    ? filtered.slice(currentPage * effectivePageSize, currentPage * effectivePageSize + effectivePageSize)
    : filtered;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(0);
  };

  const exportCsv = () => {
    const headers = displayColumns.map((c) => c.key);
    const body = filtered.map((row) =>
      headers.map((h) => `"${(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    if (summaryRow) {
      body.push(headers.map((h) => `"${(summaryRow[h] ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const lines = [headers.join(","), ...body];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sheetvision-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const showPaginationBar = paginate && totalPages > 1;
  const showPaginationControls = paginationMode === "optional" && !compact;

  return (
    <div className={cn("surface-card overflow-hidden", compact && "!shadow-none !border-slate-100")}>
      {!compact && (
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Data table</h3>
            <p className="text-xs text-slate-500">
              {filtered.length.toLocaleString()} rows · {displayColumns.length} columns
              {drillFilter && (
                <span className="text-indigo-600">
                  {" "}
                  · {drillFilter.columnLabel ?? drillFilter.column} = {drillFilter.value}
                </span>
              )}
              {paginate
                ? ` · page ${currentPage + 1} of ${totalPages}`
                : " · showing all rows"}
              {" · "}click header to sort
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showPaginationControls && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaginationOn((v) => !v);
                    setPage(0);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
                    paginate
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  {paginate ? "Paginated" : "Show all"}
                </button>
                {paginate && (
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border-0 bg-transparent py-1 text-[11px] font-medium text-slate-600 focus:outline-none"
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="relative min-w-[10rem] flex-1 sm:w-56 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {canExport && (
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-left text-sm",
            fitContainer ? "min-w-0 table-auto" : "min-w-full"
          )}
        >
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-900"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-indigo-400">{sortAsc ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 transition-colors hover:bg-indigo-500/5"
              >
                {displayColumns.map((col) => {
                  const raw = row[col.key] ?? "";
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3",
                        fitContainer ? "whitespace-nowrap" : "max-w-[240px]"
                      )}
                    >
                      {renderCellValue(raw, col, maskPII, fitContainer)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {summaryRow && (
            <tfoot>
              <tr className="border-t-2 border-indigo-200 bg-indigo-50/60">
                {displayColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3",
                      fitContainer ? "whitespace-nowrap" : "max-w-[240px]"
                    )}
                  >
                    {renderCellValue(summaryRow[col.key] ?? "", col, false, fitContainer, true)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pageRows.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-500">No matching rows.</div>
      )}

      {showPaginationBar && (
        <div
          className={cn(
            "flex items-center justify-between border-t border-slate-200 px-4 py-3",
            compact && "px-3 py-2"
          )}
        >
          <span className={cn("text-xs text-slate-500", compact && "text-[11px]")}>
            {compact ? (
              <>
                Baris {currentPage * effectivePageSize + 1}–
                {Math.min((currentPage + 1) * effectivePageSize, filtered.length)} dari{" "}
                {filtered.length.toLocaleString("id-ID")}
              </>
            ) : (
              <>
                Rows {currentPage * effectivePageSize + 1}–
                {Math.min((currentPage + 1) * effectivePageSize, filtered.length)} of{" "}
                {filtered.length.toLocaleString()}
              </>
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={cn(
                "rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900",
                currentPage === 0 && "cursor-not-allowed opacity-40"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className={cn(
                "rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900",
                currentPage >= totalPages - 1 && "cursor-not-allowed opacity-40"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
