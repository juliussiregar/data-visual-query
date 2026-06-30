"use client";

import { useState } from "react";
import type { SheetData } from "@/lib/types";
import type { SavedMetric } from "@/lib/metrics-storage";
import { DataTable } from "./DataTable";
import { DataQualityPanel } from "./DataQualityPanel";
import { MetricsLibraryPanel } from "./MetricsLibraryPanel";
import { ColumnInsights } from "./ColumnInsights";
import { InsightsPanel } from "./InsightsPanel";
import { DbTableSelect } from "./DbTableSelect";
import { formatDbTableLabel } from "@/lib/data-source-labels";
import { cn } from "@/lib/utils";
import { Table2, Columns3, Lightbulb } from "lucide-react";

type DataTab = "table" | "columns" | "insights";

interface DataViewPanelProps {
  sheetData: SheetData;
  availableTables?: string[];
  selectedTable?: string;
  onSelectTable?: (table: string) => void;
  maskPII: boolean;
  canExport: boolean;
  savedMetrics: SavedMetric[];
  canCertifyMetrics: boolean;
  onSaveMetric: (metric: SavedMetric) => void;
  onCertifyMetric: (id: string) => void;
  onRemoveMetric: (id: string) => void;
}

const TABS: { id: DataTab; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "columns", label: "Columns", icon: Columns3 },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

export function DataViewPanel({
  sheetData,
  availableTables = [],
  selectedTable,
  onSelectTable,
  maskPII,
  canExport,
  savedMetrics,
  canCertifyMetrics,
  onSaveMetric,
  onCertifyMetric,
  onRemoveMetric,
}: DataViewPanelProps) {
  const [tab, setTab] = useState<DataTab>("table");

  const tableLabel = selectedTable
    ? formatDbTableLabel(selectedTable)
    : availableTables[0]
      ? formatDbTableLabel(availableTables[0])
      : "";
  const showTablePicker = availableTables.length > 1 && onSelectTable;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Data</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tableLabel ? (
              <>
                <span className="font-medium text-slate-700">{tableLabel}</span>
                {" · "}
              </>
            ) : null}
            {sheetData.rows.length.toLocaleString()} rows · {sheetData.columns.length} columns
          </p>
          {showTablePicker && (
            <div className="mt-2 max-w-md">
              <DbTableSelect
                value={selectedTable ?? availableTables[0]}
                onChange={onSelectTable}
                tables={availableTables}
                formatLabel={formatDbTableLabel}
                size="sm"
                ariaLabel="Pilih tabel data"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:flex-none sm:px-4",
              tab === id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "insights" && sheetData.insights.length > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  tab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                {sheetData.insights.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "table" && (
        <div className="space-y-4">
          {sheetData.dataset?.quality && (
            <DataQualityPanel report={sheetData.dataset.quality} />
          )}
          <DataTable
            rows={sheetData.rows}
            columns={sheetData.columns}
            maskPII={maskPII}
            canExport={canExport}
            maxColumns={0}
            paginationMode="optional"
            fitContainer
          />
          {(sheetData.metrics?.length || savedMetrics.length > 0) && (
            <MetricsLibraryPanel
              metrics={sheetData.metrics ?? []}
              values={sheetData.metricValues}
              savedMetrics={savedMetrics}
              canCertify={canCertifyMetrics}
              onSaveMetric={onSaveMetric}
              onCertifyMetric={onCertifyMetric}
              onRemoveMetric={onRemoveMetric}
            />
          )}
        </div>
      )}

      {tab === "columns" && (
        <div className="surface-card p-4 sm:p-5">
          <ColumnInsights columns={sheetData.columns} />
        </div>
      )}

      {tab === "insights" && (
        <div className="surface-card p-4 sm:p-5">
          {sheetData.insights.length > 0 ? (
            <InsightsPanel insights={sheetData.insights} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No automatic insights for this dataset yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
