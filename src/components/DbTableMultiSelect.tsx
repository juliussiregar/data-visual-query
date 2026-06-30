"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search, X } from "lucide-react";
import { DbTablePreviewPanel } from "@/components/DbTablePreviewPanel";
import type { TablePreviewData } from "@/components/DbTablePreviewPanel";
import { formatDbTableLabel } from "@/lib/data-source-labels";
import { filterDbTableNames } from "@/lib/db-table-filter";
import { cn } from "@/lib/utils";

export interface DbTableOption {
  schema: string;
  name: string;
  fullName: string;
}

interface DbTableMultiSelectProps {
  tables: DbTableOption[];
  selected: string[];
  loading?: boolean;
  totalCount?: number;
  truncated?: boolean;
  onSearchTables?: (query: string) => Promise<DbTableOption[]>;
  onPreviewTable?: (tableName: string) => Promise<TablePreviewData>;
  onChange: (tables: string[]) => void;
  compact?: boolean;
}

export function DbTableMultiSelect({
  tables,
  selected,
  loading,
  totalCount,
  truncated,
  onSearchTables,
  onPreviewTable,
  onChange,
  compact,
}: DbTableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [serverResults, setServerResults] = useState<DbTableOption[] | null>(null);
  const [previewTableName, setPreviewTableName] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<TablePreviewData | null>(null);

  const resolvedTotal = totalCount ?? tables.length;
  const useServerSearch = Boolean(truncated && onSearchTables && query.trim().length >= 2);

  useEffect(() => {
    if (!useServerSearch) {
      setServerResults(null);
      setSearching(false);
      return;
    }

    const q = query.trim();
    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void onSearchTables!(q)
        .then((next) => {
          if (!cancelled) setServerResults(next);
        })
        .catch(() => {
          if (!cancelled) setServerResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, useServerSearch, onSearchTables]);

  const displayTables = useMemo(() => {
    if (useServerSearch) return serverResults ?? [];
    return tables;
  }, [tables, useServerSearch, serverResults]);

  const filteredTables = useMemo(
    () =>
      filterDbTableNames(
        displayTables.map((t) => t.name),
        useServerSearch ? "" : query,
        (name) => {
          const table = displayTables.find((t) => t.name === name);
          return table ? formatDbTableLabel(table.fullName) : name;
        }
      ).map((name) => displayTables.find((t) => t.name === name)!),
    [displayTables, query, useServerSearch]
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const allKnownTables = useMemo(() => {
    const map = new Map<string, DbTableOption>();
    for (const table of tables) map.set(table.name, table);
    for (const table of displayTables) map.set(table.name, table);
    return map;
  }, [tables, displayTables]);

  const closePreview = useCallback(() => {
    setPreviewTableName(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewData(null);
  }, []);

  const openPreview = useCallback(
    (tableName: string) => {
      if (!onPreviewTable) return;
      if (previewTableName === tableName) {
        closePreview();
        return;
      }

      setPreviewTableName(tableName);
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewData(null);

      void onPreviewTable(tableName)
        .then((data) => {
          setPreviewData(data);
        })
        .catch((error) => {
          setPreviewError(error instanceof Error ? error.message : "Gagal memuat preview");
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    },
    [closePreview, onPreviewTable, previewTableName]
  );

  const toggle = (name: string) => {
    onChange(
      selected.includes(name) ? selected.filter((t) => t !== name) : [...selected, name]
    );
  };

  const selectFiltered = () => {
    const next = new Set(selected);
    for (const table of filteredTables) next.add(table.name);
    onChange([...next]);
  };

  const clearFiltered = () => {
    const filteredNames = new Set(filteredTables.map((t) => t.name));
    onChange(selected.filter((name) => !filteredNames.has(name)));
  };

  const clearAll = () => onChange([]);

  const previewLabel = previewTableName
    ? formatDbTableLabel(allKnownTables.get(previewTableName)?.fullName ?? previewTableName)
    : "";

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Memuat daftar tabel…
      </p>
    );
  }

  if (tables.length === 0 && !truncated) {
    return (
      <p className="text-xs text-slate-500">
        Belum ada tabel yang bisa dipilih. Periksa koneksi database Anda.
      </p>
    );
  }

  const filteredSelectedCount = filteredTables.filter((t) => selectedSet.has(t.name)).length;
  const showBulkActions = (useServerSearch ? filteredTables.length : tables.length) > 6;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">{selected.length}</span> dipilih
          {" · "}
          {resolvedTotal} tabel di database
          {truncated && !useServerSearch ? (
            <span className="text-amber-600"> (menampilkan {tables.length})</span>
          ) : null}
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-medium text-slate-500 hover:text-red-600"
          >
            Hapus semua
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="max-h-20 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const table = allKnownTables.get(name);
            const label = table ? formatDbTableLabel(table.fullName) : name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-800"
                title={`Hapus ${label}`}
              >
                <span className="truncate">{label}</span>
                <X className="h-3 w-3 shrink-0 opacity-70" />
              </button>
            );
          })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            truncated
              ? "Cari tabel (min. 2 huruf untuk cari di seluruh database)…"
              : "Cari tabel…"
          }
          className="w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-10 pr-8 text-xs leading-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
        />
        {(query || searching) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {truncated && query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-[11px] text-amber-700">
          Ketik minimal 2 huruf untuk mencari di semua {resolvedTotal} tabel.
        </p>
      )}

      {showBulkActions && !useServerSearch && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectFiltered}
            disabled={filteredTables.length === 0}
            className="text-[11px] font-medium text-violet-700 hover:text-violet-900 disabled:opacity-40"
          >
            Pilih {query ? "hasil filter" : "semua"}
            {query ? ` (${filteredTables.length})` : ""}
          </button>
          {filteredSelectedCount > 0 && (
            <button
              type="button"
              onClick={clearFiltered}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
            >
              Batal pilih {query ? "hasil filter" : "semua"}
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "space-y-0.5 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-50/60 p-1.5",
          compact ? "h-36" : "h-44"
        )}
        role="listbox"
        aria-label="Daftar tabel"
      >
        {searching ? (
          <p className="flex items-center justify-center gap-2 px-2 py-6 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Mencari…
          </p>
        ) : filteredTables.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            {useServerSearch && query.trim().length < 2
              ? "Ketik minimal 2 huruf untuk mencari."
              : `Tidak ada tabel cocok dengan "${query}"`}
          </p>
        ) : (
          filteredTables.map((table) => {
            const checked = selectedSet.has(table.name);
            const rowKey = table.fullName || `${table.schema}.${table.name}` || table.name;
            const label =
              formatDbTableLabel(table.fullName) ||
              (table.schema && table.name ? `${table.schema}.${table.name}` : table.name);
            const previewActive = previewTableName === table.name;
            return (
              <div
                key={rowKey}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-1 py-0.5 transition-colors",
                  previewActive ? "bg-indigo-50/80" : checked ? "bg-violet-50/80" : "hover:bg-white"
                )}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-1 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(table.name)}
                    className="rounded border-slate-300 text-violet-600"
                  />
                  <span className={cn("truncate", checked ? "text-violet-900" : "text-slate-700")}>
                    {label}
                  </span>
                </label>
                {onPreviewTable ? (
                  <button
                    type="button"
                    onClick={() => openPreview(table.name)}
                    className={cn(
                      "shrink-0 rounded-md p-1.5 transition-colors",
                      previewActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-slate-400 hover:bg-white hover:text-indigo-600"
                    )}
                    title="Lihat preview tanpa memilih"
                    aria-label={`Lihat preview ${label}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {previewTableName && onPreviewTable ? (
        <DbTablePreviewPanel
          tableLabel={previewLabel}
          loading={previewLoading}
          error={previewError}
          data={previewData}
          onClose={closePreview}
        />
      ) : null}

      <p className="text-[11px] leading-relaxed text-slate-400">
        {onPreviewTable
          ? "Klik ikon mata untuk lihat kolom dan contoh data sebelum memilih."
          : truncated
            ? "Database punya banyak tabel — gunakan Cari untuk menemukan tabel di luar daftar awal."
            : "Pilih satu atau lebih tabel. Daftar di atas bisa di-scroll jika tabel banyak."}
      </p>
    </div>
  );
}
