"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { formatDbTableLabel } from "@/lib/data-source-labels";
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
  onChange: (tables: string[]) => void;
  compact?: boolean;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function DbTableMultiSelect({
  tables,
  selected,
  loading,
  onChange,
  compact,
}: DbTableMultiSelectProps) {
  const [query, setQuery] = useState("");

  const filteredTables = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return tables;
    return tables.filter((table) => {
      const label = formatDbTableLabel(table.fullName).toLowerCase();
      return label.includes(q) || table.name.toLowerCase().includes(q);
    });
  }, [tables, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

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

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Memuat daftar tabel…
      </p>
    );
  }

  if (tables.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Belum ada tabel yang bisa dipilih. Periksa koneksi database Anda.
      </p>
    );
  }

  const filteredSelectedCount = filteredTables.filter((t) => selectedSet.has(t.name)).length;
  const showBulkActions = tables.length > 6;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          <span className="font-medium text-slate-700">{selected.length}</span> dipilih
          {" · "}
          {tables.length} tabel
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
            const table = tables.find((t) => t.name === name);
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
          placeholder="Cari tabel…"
          className="w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-10 pr-8 text-xs leading-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showBulkActions && (
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
        {filteredTables.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            Tidak ada tabel cocok dengan &ldquo;{query}&rdquo;
          </p>
        ) : (
          filteredTables.map((table) => {
            const checked = selectedSet.has(table.name);
            const rowKey = table.fullName || `${table.schema}.${table.name}` || table.name;
            const label =
              formatDbTableLabel(table.fullName) ||
              (table.schema && table.name ? `${table.schema}.${table.name}` : table.name);
            return (
              <label
                key={rowKey}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  checked ? "bg-violet-50 text-violet-900" : "text-slate-700 hover:bg-white"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(table.name)}
                  className="rounded border-slate-300 text-violet-600"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">
        Pilih satu atau lebih tabel. Daftar di atas bisa di-scroll jika tabel banyak.
      </p>
    </div>
  );
}
