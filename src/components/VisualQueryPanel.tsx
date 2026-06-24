"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  X,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { SheetData } from "@/lib/types";
import { SectionHeader } from "./SectionHeader";
import { DataTable } from "./DataTable";
import {
  applyVisualQuery,
  createCondition,
  defaultOperatorForType,
  EMPTY_VISUAL_QUERY,
  getColumnOptions,
  getDistinctValues,
  isVisualQueryActive,
  operatorNeedsSecondValue,
  operatorNeedsValue,
  operatorsForColumn,
  OPERATOR_LABELS,
  visualQuerySummary,
  type QueryCondition,
  type VisualQuery,
} from "@/lib/visual-query";
import { cn } from "@/lib/utils";

interface VisualQueryPanelProps {
  data: SheetData;
  query: VisualQuery;
  onChange: (query: VisualQuery) => void;
  onApplyToDashboard: () => void;
  onClear: () => void;
  maskPII?: boolean;
  canExport?: boolean;
}

function ConditionRow({
  condition,
  columns,
  rows,
  onChange,
  onRemove,
}: {
  condition: QueryCondition;
  columns: ReturnType<typeof getColumnOptions>;
  rows: Record<string, string>[];
  onChange: (c: QueryCondition) => void;
  onRemove: () => void;
}) {
  const col = columns.find((c) => c.key === condition.columnKey);
  const ops = operatorsForColumn(col);
  const needsValue = operatorNeedsValue(condition.operator);
  const needsSecond = operatorNeedsSecondValue(condition.operator);
  const options =
    col && col.type === "category" && col.uniqueCount <= 30
      ? getDistinctValues(rows, col.key)
      : [];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="min-w-[140px] flex-1">
        <span className="text-[10px] font-medium text-slate-500">Kolom</span>
        <select
          value={condition.columnKey}
          onChange={(e) => {
            const nextCol = columns.find((c) => c.key === e.target.value);
            onChange({
              ...condition,
              columnKey: e.target.value,
              operator: defaultOperatorForType(nextCol?.type ?? "text"),
              value: "",
              valueTo: "",
            });
          }}
          className="input-field mt-1 py-2 text-xs"
        >
          <option value="">Pilih kolom…</option>
          {columns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.businessLabel ?? c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[130px] flex-1">
        <span className="text-[10px] font-medium text-slate-500">Syarat</span>
        <select
          value={condition.operator}
          onChange={(e) =>
            onChange({
              ...condition,
              operator: e.target.value as QueryCondition["operator"],
              valueTo: "",
            })
          }
          disabled={!condition.columnKey}
          className="input-field mt-1 py-2 text-xs disabled:opacity-50"
        >
          {ops.map((op) => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>
      </label>

      {needsValue && (
        <label className="min-w-[140px] flex-1">
          <span className="text-[10px] font-medium text-slate-500">Nilai</span>
          {options.length > 0 ? (
            <select
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="input-field mt-1 py-2 text-xs"
            >
              <option value="">Pilih…</option>
              {options.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={col?.type === "number" ? "number" : "text"}
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              placeholder={col?.type === "number" ? "Angka" : "Ketik nilai…"}
              className="input-field mt-1 py-2 text-xs"
            />
          )}
        </label>
      )}

      {needsSecond && (
        <label className="min-w-[120px] flex-1">
          <span className="text-[10px] font-medium text-slate-500">Sampai</span>
          <input
            type="number"
            value={condition.valueTo ?? ""}
            onChange={(e) => onChange({ ...condition, valueTo: e.target.value })}
            placeholder="Angka"
            className="input-field mt-1 py-2 text-xs"
          />
        </label>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="self-end rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-500"
        title="Hapus syarat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function VisualQueryPanel({
  data,
  query,
  onChange,
  onApplyToDashboard,
  onClear,
  maskPII,
  canExport,
}: VisualQueryPanelProps) {
  const [draft, setDraft] = useState<VisualQuery>(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  const columnOptions = useMemo(() => getColumnOptions(data.columns), [data.columns]);

  const previewRows = useMemo(
    () => applyVisualQuery(data.rows, draft, data.columns),
    [data.rows, draft, data.columns]
  );

  const active = isVisualQueryActive(draft);

  const syncDraft = (next: VisualQuery) => {
    setDraft(next);
  };

  const addCondition = () => {
    const firstKey = columnOptions[0]?.key ?? "";
    syncDraft({
      ...draft,
      conditions: [...draft.conditions, createCondition(firstKey)],
    });
  };

  const updateCondition = (id: string, next: QueryCondition) => {
    syncDraft({
      ...draft,
      conditions: draft.conditions.map((c) => (c.id === id ? next : c)),
    });
  };

  const removeCondition = (id: string) => {
    syncDraft({
      ...draft,
      conditions: draft.conditions.filter((c) => c.id !== id),
    });
  };

  const handleClear = () => {
    setDraft(EMPTY_VISUAL_QUERY);
    onClear();
  };

  const handleApply = () => {
    onChange(draft);
    onApplyToDashboard();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cari Data"
        description="Saring dan urutkan data tanpa menulis kode — cukup pilih kolom, syarat, dan nilai."
      />

      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
              <Search className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Cari cepat</p>
              <p className="text-[10px] text-slate-500">Ketik kata kunci — dicari di semua kolom</p>
            </div>
          </div>
          <input
            type="search"
            value={draft.searchText}
            onChange={(e) => syncDraft({ ...draft, searchText: e.target.value })}
            placeholder="Contoh: Jakarta, Aktif, 500 juta…"
            className="input-field mt-3"
          />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-800">Syarat lanjutan</span>
              <span className="text-[10px] text-slate-400">(semua syarat harus cocok)</span>
            </div>
            <button
              type="button"
              onClick={addCondition}
              className="btn-ghost py-1.5 text-[11px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah syarat
            </button>
          </div>

          {draft.conditions.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
              Belum ada syarat. Klik &quot;Tambah syarat&quot; untuk filter per kolom — misalnya
              Region sama dengan Jabotabek, atau Outstanding lebih dari 1000000.
            </p>
          )}

          <div className="space-y-2">
            {draft.conditions.map((cond) => (
              <ConditionRow
                key={cond.id}
                condition={cond}
                columns={columnOptions}
                rows={data.rows}
                onChange={(c) => updateCondition(cond.id, c)}
                onRemove={() => removeCondition(cond.id)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="text-[10px] font-medium text-slate-500">Urutkan berdasarkan</span>
              <select
                value={draft.sort?.columnKey ?? ""}
                onChange={(e) =>
                  syncDraft({
                    ...draft,
                    sort: e.target.value
                      ? {
                          columnKey: e.target.value,
                          direction: draft.sort?.direction ?? "desc",
                        }
                      : null,
                  })
                }
                className="input-field mt-1 py-2 text-xs"
              >
                <option value="">Tanpa pengurutan</option>
                {columnOptions.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.businessLabel ?? c.label}
                  </option>
                ))}
              </select>
            </label>
            {draft.sort && (
              <label className="sm:w-36">
                <span className="text-[10px] font-medium text-slate-500">Arah</span>
                <select
                  value={draft.sort.direction}
                  onChange={(e) =>
                    syncDraft({
                      ...draft,
                      sort: {
                        ...draft.sort!,
                        direction: e.target.value as "asc" | "desc",
                      },
                    })
                  }
                  className="input-field mt-1 py-2 text-xs"
                >
                  <option value="desc">Terbesar / Z→A</option>
                  <option value="asc">Terkecil / A→Z</option>
                </select>
              </label>
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          active ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50"
        )}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {previewRows.length.toLocaleString("id-ID")}{" "}
            <span className="font-normal text-slate-500">
              dari {data.rows.length.toLocaleString("id-ID")} baris
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{visualQuerySummary(draft, data.columns)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleClear} className="btn-ghost text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!active}
            className="btn-primary text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Terapkan ke Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <DataTable
        rows={previewRows}
        columns={data.columns}
        maskPII={maskPII}
        canExport={canExport}
        maxColumns={0}
        paginationMode="optional"
        fitContainer
      />
    </div>
  );
}

export function VisualQueryEmptyState({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="overview-empty mx-auto max-w-lg">
      <Search className="mb-3 h-10 w-10 text-indigo-400" />
      <h2 className="text-lg font-semibold text-slate-900">Belum ada data</h2>
      <p className="mt-2 text-sm text-slate-500">
        Muat Google Sheet atau koneksi database dulu, lalu kembali ke sini untuk mencari dan
        menyaring data dengan mudah.
      </p>
      <button type="button" onClick={onGoHome} className="btn-primary mt-5 text-sm">
        Ke halaman utama
      </button>
    </div>
  );
}
