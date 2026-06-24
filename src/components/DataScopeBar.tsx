"use client";

import { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import type { ColumnMeta, DataScope } from "@/lib/types";
import { getScopeableColumns, scopeLabel } from "@/lib/data-scope";
import { cn } from "@/lib/utils";

interface DataScopeBarProps {
  columns: ColumnMeta[];
  rows: Record<string, string>[];
  scope: DataScope | null;
  totalRows: number;
  scopedRows: number;
  onChange: (scope: DataScope | null) => void;
}

export function DataScopeBar({
  columns,
  rows,
  scope,
  totalRows,
  scopedRows,
  onChange,
}: DataScopeBarProps) {
  const scopeable = getScopeableColumns(columns);
  const [columnKey, setColumnKey] = useState(scope?.columnKey ?? scopeable[0]?.key ?? "");

  useEffect(() => {
    if (scope?.columnKey) setColumnKey(scope.columnKey);
    else if (scopeable[0] && !scopeable.some((c) => c.key === columnKey)) {
      setColumnKey(scopeable[0].key);
    }
  }, [scope?.columnKey, scopeable, columnKey]);

  if (scopeable.length === 0) return null;

  const activeCol = scopeable.find((c) => c.key === columnKey) ?? scopeable[0];
  const activeValue = scope?.columnKey === activeCol.key ? (scope?.values[0] ?? "") : "";

  const options = [
    ...new Set(rows.map((r) => r[activeCol.key]?.trim()).filter(Boolean) as string[]),
  ].sort();

  const label = scopeLabel(scope, columns);
  const isActive = Boolean(scope?.values.length);

  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
            <Shield className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-900">Scope Akses</span>
            <p className="text-[11px] text-slate-500">
              Batasi baris per dimensi · {scopedRows.toLocaleString("id-ID")} /{" "}
              {totalRows.toLocaleString("id-ID")} baris
            </p>
          </div>
        </div>
        {isActive && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <X className="h-3 w-3" />
            Hapus scope
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={activeCol.key}
          onChange={(e) => {
            setColumnKey(e.target.value);
            onChange(null);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15"
        >
          {scopeable.map((col) => (
            <option key={col.key} value={col.key}>
              {col.businessLabel ?? col.label}
            </option>
          ))}
        </select>

        <select
          value={activeValue}
          onChange={(e) => {
            const val = e.target.value;
            if (!val) onChange(null);
            else onChange({ columnKey: activeCol.key, values: [val] });
          }}
          className={cn(
            "min-w-[160px] flex-1 rounded-lg border bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/15",
            isActive
              ? "border-violet-300 font-medium text-violet-800"
              : "border-slate-200 text-slate-700"
          )}
        >
          <option value="">Semua {activeCol.label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {label && (
        <p className="mt-2 text-[11px] text-violet-700">
          Aktif: {label} · filter berlaku untuk sesi ini
        </p>
      )}
    </div>
  );
}
