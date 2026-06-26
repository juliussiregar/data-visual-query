"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Sparkles, BarChart3, Table2, LayoutGrid } from "lucide-react";
import type { DerivedField } from "@/lib/derived-fields";
import { sheetDataWithDerivedFields, derivedFieldsForTable } from "@/lib/derived-fields";
import type { SheetData } from "@/lib/types";
import {
  defaultVisualSqlForColumns,
  executeVisualSql,
  parseVisualSql,
  normalizeVisualSql,
  toggleVisualSqlColumn,
  visualSqlExamplesForColumns,
  chartConfigFromVisualSqlResult,
  type VisualSqlResult,
} from "@/lib/visual-sql";
import type { QueryDashboardAddMode } from "@/lib/query-widget";
import type { ChartType } from "@/lib/types";
import type { TableRelation } from "@/lib/sql-query-types";
import { formatDbTableLabel } from "@/lib/db-table-datasets";
import { formatDatasetLabel } from "@/lib/table-relations";
import { ChartCard } from "./ChartCard";
import { QuerySchemaSidebar } from "./QuerySchemaSidebar";
import { formatDisplayValue } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QueryEditorPanelProps {
  data: SheetData;
  derivedFields?: DerivedField[];
  activeTable?: string;
  dbDatasets?: Record<string, SheetData> | null;
  availableTables?: string[];
  tableRelations?: TableRelation[];
  onSelectTable?: (tableKey: string) => void;
  onAddToDashboard?: (
    result: VisualSqlResult,
    mode: QueryDashboardAddMode,
    chartType: ChartType,
    sql: string
  ) => void;
  className?: string;
}

export function QueryEditorPanel({
  data,
  derivedFields = [],
  activeTable,
  dbDatasets,
  availableTables = [],
  tableRelations,
  onSelectTable,
  onAddToDashboard,
  className,
}: QueryEditorPanelProps) {
  const tableDerivedFields = useMemo(
    () => derivedFieldsForTable(derivedFields, data.columns),
    [derivedFields, data.columns]
  );

  const queryData = useMemo(
    () => sheetDataWithDerivedFields(data, tableDerivedFields),
    [data, tableDerivedFields]
  );

  const derivedKeys = useMemo(
    () => new Set(tableDerivedFields.map((f) => f.key)),
    [tableDerivedFields]
  );

  const schemaTables = useMemo(() => {
    if (availableTables.length > 0 && dbDatasets) {
      return availableTables.map((key) => ({
        key,
        label: formatDatasetLabel(key, tableRelations) || formatDbTableLabel(key),
        columnCount: dbDatasets[key]?.columns.length ?? 0,
      }));
    }
    const label =
      (activeTable && formatDatasetLabel(activeTable, tableRelations)) ||
      formatDbTableLabel(activeTable ?? "") ||
      queryData.dataset?.name ||
      "Data";
    return [
      {
        key: activeTable || queryData.dataset?.name || "default",
        label,
        columnCount: queryData.columns.length,
      },
    ];
  }, [availableTables, dbDatasets, activeTable, tableRelations, queryData]);

  const tableScope = activeTable || queryData.dataset?.name || "default";
  const activeTableKey = activeTable || schemaTables[0]?.key || "";

  const sqlTableRef =
    activeTableKey && activeTableKey !== "default" ? activeTableKey : undefined;

  const examples = useMemo(
    () => visualSqlExamplesForColumns(queryData.columns, sqlTableRef),
    [queryData.columns, sqlTableRef]
  );

  const otherTables = useMemo(() => {
    if (!activeTableKey || availableTables.length <= 1) return [];
    return schemaTables.filter((t) => t.key !== activeTableKey);
  }, [activeTableKey, availableTables.length, schemaTables]);

  const [sql, setSql] = useState(() => defaultVisualSqlForColumns(queryData.columns, sqlTableRef));
  const [result, setResult] = useState<VisualSqlResult | null>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");

  useEffect(() => {
    setSql(defaultVisualSqlForColumns(queryData.columns, sqlTableRef));
    setResult(null);
  }, [tableScope, queryData.columns, sqlTableRef]);

  const previewChart = useMemo(() => {
    if (!result?.chart) return null;
    return chartConfigFromVisualSqlResult(result, queryData.columns, chartType);
  }, [result, queryData.columns, chartType]);

  const runQuery = () => {
    const normalized = normalizeVisualSql(sql, queryData.columns, sqlTableRef);
    if (normalized !== sql.trim().replace(/\s+/g, " ")) {
      setSql(normalized);
    }
    const executed = executeVisualSql(queryData, normalized, queryData.columns, sqlTableRef);
    setResult(executed);
  };

  const normalizedSql = useMemo(
    () => normalizeVisualSql(sql, queryData.columns, sqlTableRef),
    [sql, queryData.columns, sqlTableRef]
  );

  const handleToggleColumn = (columnKey: string, select: boolean) => {
    setSql((prev) =>
      toggleVisualSqlColumn(prev, columnKey, queryData.columns, select, sqlTableRef)
    );
    setResult(null);
  };

  const parsed = parseVisualSql(normalizedSql);

  const canAddChart = Boolean(result?.chart && !result?.error);
  const canAddTable = Boolean(result && !result.error && result.rows.length > 0);
  const canAddBoth = canAddChart && canAddTable;

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-start", className)}>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Query editor (SQL-like)</h3>
          </div>
          <div className="mb-3">
            {otherTables.length > 0 && (
              <p className="text-[11px] leading-relaxed text-slate-500">
                Tabel lain: {otherTables.map((t) => t.label).join(", ")} — pilih di Schema explorer.
              </p>
            )}
            {!otherTables.length && (
              <p className="text-[11px] text-slate-500">
                Klik kolom di panel kanan untuk menyusun query.
              </p>
            )}
          </div>
          <textarea
            value={sql}
            onChange={(e) => {
              setSql(e.target.value);
              setResult(null);
            }}
            rows={4}
            className="input-field w-full font-mono text-xs"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={runQuery} className="btn-primary inline-flex gap-1 text-xs">
              <Play className="h-3.5 w-3.5" />
              Jalankan & visualisasi
            </button>
            {canAddTable && onAddToDashboard && (
              <button
                type="button"
                onClick={() => onAddToDashboard(result!, "table", chartType, sql)}
                className="btn-ghost inline-flex gap-1 border border-slate-200 text-xs text-slate-700"
              >
                <Table2 className="h-3.5 w-3.5" />
                Tambah tabel
              </button>
            )}
            {canAddChart && onAddToDashboard && (
              <button
                type="button"
                onClick={() => onAddToDashboard(result!, "chart", chartType, sql)}
                className="btn-ghost inline-flex gap-1 border border-indigo-200 text-xs text-indigo-700"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Tambah grafik
              </button>
            )}
            {canAddBoth && onAddToDashboard && (
              <button
                type="button"
                onClick={() => onAddToDashboard(result!, "both", chartType, sql)}
                className="btn-ghost inline-flex gap-1 border border-violet-200 text-xs text-violet-700"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Tambah keduanya
              </button>
            )}
          </div>
          {parsed.error && (
            <p className="mt-2 text-[11px] text-amber-700">{parsed.error}</p>
          )}
          {result?.error && (
            <p className="mt-2 text-[11px] text-red-600">{result.error}</p>
          )}
        </div>

        {result && !result.error && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-medium text-slate-800">{result.summary}</p>
            {previewChart && (
              <div className="mb-4">
                <ChartCard
                  chart={previewChart}
                  showTypePicker
                  pickerStyle="chips"
                  controlledType={chartType}
                  onTypeChange={setChartType}
                />
              </div>
            )}
            {result.rows.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-100">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {Object.keys(result.rows[0]).map((k) => (
                        <th key={k} className="px-2 py-1.5 font-medium text-slate-600">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1 tabular-nums text-slate-800">
                            {formatDisplayValue(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setSql(ex);
                setResult(null);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600 hover:bg-white"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <QuerySchemaSidebar
        className="w-full shrink-0 lg:w-56 xl:w-64"
        columns={queryData.columns}
        sql={normalizedSql}
        onToggleColumn={handleToggleColumn}
        tables={schemaTables}
        activeTable={activeTable || schemaTables[0]?.key}
        onSelectTable={availableTables.length > 1 ? onSelectTable : undefined}
        derivedKeys={derivedKeys}
      />
    </div>
  );
}
