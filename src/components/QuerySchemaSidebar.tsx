"use client";

import { useMemo } from "react";
import { Database, Hash, Layers, Type } from "lucide-react";
import { columnDisplayLabel, numericColumns } from "@/lib/derived-fields";
import { columnKeysInVisualSql } from "@/lib/visual-sql";
import type { ColumnMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface QuerySchemaTable {
  key: string;
  label: string;
  columnCount?: number;
}

interface QuerySchemaSidebarProps {
  columns: ColumnMeta[];
  sql: string;
  onToggleColumn: (columnKey: string, select: boolean) => void;
  tables?: QuerySchemaTable[];
  activeTable?: string;
  onSelectTable?: (tableKey: string) => void;
  derivedKeys?: Set<string>;
  className?: string;
}

function ColumnChip({
  col,
  selected,
  isCustom,
  hint,
  onClick,
}: {
  col: ColumnMeta;
  selected: boolean;
  isCustom?: boolean;
  hint?: string;
  onClick: () => void;
}) {
  const label = columnDisplayLabel(col);
  const showKey = label !== col.key;

  return (
    <button
      type="button"
      onClick={onClick}
      title={hint ?? col.key}
      className={cn(
        "w-full rounded-lg border px-2 py-1.5 text-left text-[10px] transition-colors",
        selected
          ? isCustom
            ? "border-violet-400 bg-violet-100 text-violet-900"
            : "border-indigo-300 bg-indigo-50 text-indigo-900"
          : isCustom
            ? "border-violet-200 bg-violet-50/50 text-violet-800 hover:border-violet-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
      )}
    >
      <span className="font-medium">{label}</span>
      {showKey && (
        <span className={cn("ml-1 font-mono text-[9px]", selected ? "opacity-70" : "text-slate-400")}>
          {col.key}
        </span>
      )}
      {isCustom && <span className="ml-1 text-[9px] opacity-70">custom</span>}
    </button>
  );
}

export function QuerySchemaSidebar({
  columns,
  sql,
  onToggleColumn,
  tables = [],
  activeTable,
  onSelectTable,
  derivedKeys,
  className,
}: QuerySchemaSidebarProps) {
  const selectedKeys = useMemo(
    () => new Set(columnKeysInVisualSql(sql, columns)),
    [sql, columns]
  );

  const dimensions = useMemo(
    () =>
      columns.filter(
        (c) =>
          c.key.trim() &&
          (c.type === "category" || c.type === "text" || c.semanticRole === "dimension") &&
          !numericColumns(columns).some((n) => n.key === c.key)
      ),
    [columns]
  );

  const measures = useMemo(() => numericColumns(columns), [columns]);

  const toggle = (key: string) => {
    onToggleColumn(key, !selectedKeys.has(key));
  };

  return (
    <aside
      className={cn(
        "flex max-h-[min(520px,70vh)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80",
        className
      )}
    >
      <div className="border-b border-slate-200 bg-white px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-900">Schema explorer</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Klik kolom untuk tambah / hapus dari query.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 space-y-3">
        {tables.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Database className="h-3 w-3" />
              Tabel
            </div>
            <div className="space-y-1">
              {tables.map((table) => {
                const active = activeTable === table.key || (!activeTable && tables.length === 1);
                return (
                  <button
                    key={table.key}
                    type="button"
                    disabled={!onSelectTable || tables.length <= 1}
                    onClick={() => onSelectTable?.(table.key)}
                    className={cn(
                      "w-full rounded-lg border px-2 py-1.5 text-left text-[10px] transition-colors",
                      active
                        ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                      tables.length <= 1 && "cursor-default"
                    )}
                  >
                    <span className="block truncate">{table.label}</span>
                    {table.columnCount != null && (
                      <span className="text-[9px] text-slate-400">{table.columnCount} kolom</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {dimensions.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Layers className="h-3 w-3" />
              Dimensi (GROUP BY)
            </div>
            <div className="space-y-1">
              {dimensions.map((col) => (
                <ColumnChip
                  key={col.key}
                  col={col}
                  selected={selectedKeys.has(col.key)}
                  isCustom={derivedKeys?.has(col.key)}
                  hint={
                    selectedKeys.has(col.key)
                      ? "Hapus dari GROUP BY"
                      : "Jadikan kelompok (GROUP BY)"
                  }
                  onClick={() => toggle(col.key)}
                />
              ))}
            </div>
          </section>
        )}

        {measures.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Hash className="h-3 w-3" />
              Metrik (AVG)
            </div>
            <div className="space-y-1">
              {measures.map((col) => (
                <ColumnChip
                  key={col.key}
                  col={col}
                  selected={selectedKeys.has(col.key)}
                  isCustom={derivedKeys?.has(col.key)}
                  hint={
                    selectedKeys.has(col.key)
                      ? "Hapus AVG dari SELECT"
                      : "Tambah AVG ke SELECT"
                  }
                  onClick={() => toggle(col.key)}
                />
              ))}
            </div>
          </section>
        )}

        {dimensions.length === 0 && measures.length === 0 && (
          <p className="text-[10px] text-slate-500">Belum ada kolom di tabel ini.</p>
        )}

        {columns.some(
          (c) =>
            c.key.trim() &&
            !dimensions.some((d) => d.key === c.key) &&
            !measures.some((m) => m.key === c.key)
        ) && (
          <section>
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Type className="h-3 w-3" />
              Kolom lain
            </div>
            <div className="space-y-1">
              {columns
                .filter(
                  (c) =>
                    c.key.trim() &&
                    !dimensions.some((d) => d.key === c.key) &&
                    !measures.some((m) => m.key === c.key)
                )
                .map((col) => (
                  <ColumnChip
                    key={col.key}
                    col={col}
                    selected={selectedKeys.has(col.key)}
                    isCustom={derivedKeys?.has(col.key)}
                    onClick={() => toggle(col.key)}
                  />
                ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
