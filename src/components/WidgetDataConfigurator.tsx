"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from "react";
import type { DerivedField } from "@/lib/derived-fields";
import { buildDerivedFieldHelpText } from "@/lib/derived-fields";
import type { ColumnMeta, SheetData, WidgetConfig, WidgetDataQuery } from "@/lib/types";
import {
  AGGREGATION_LABELS,
  EMPTY_WIDGET_DATA_QUERY,
  defaultTableDisplayColumns,
  widgetPreviewSummary,
} from "@/lib/widget-data";
import { resolveWidgetSheetData } from "@/lib/db-table-datasets";
import { getShapeDef } from "@/lib/widget-catalog";
import {
  createCondition,
  defaultOperatorForType,
  getColumnOptions,
  getDistinctValues,
  operatorNeedsSecondValue,
  operatorNeedsValue,
  operatorsForColumn,
  OPERATOR_LABELS,
} from "@/lib/visual-query";
import {
  Plus,
  X,
  Filter,
  Layers,
  Calculator,
  ArrowUpDown,
  Table2,
  ChevronDown,
  HelpCircle,
  LayoutGrid,
} from "lucide-react";
import { formatDbTableLabel } from "@/lib/db-table-datasets";
import { formatDatasetLabel } from "@/lib/table-relations";
import { DbTableSelect } from "./DbTableSelect";
import type { TableRelation } from "@/lib/sql-query-types";
import { cn } from "@/lib/utils";
import { getWidgetLayoutWidth, isForcedFullWidth, layoutWidthLabel } from "@/lib/widget-layout";
import { DerivedColumnQuickAdd, type DerivedColumnQuickAddHandle } from "./DerivedColumnQuickAdd";

export interface WidgetDataConfiguratorHandle {
  commitPendingDerivedField: () => Promise<{ widgetPatch?: Partial<WidgetConfig>; error?: string }>;
}

interface WidgetDataConfiguratorProps {
  data: SheetData;
  primaryData?: SheetData;
  dbDatasets?: Record<string, SheetData> | null;
  availableTables?: string[];
  tableRelations?: TableRelation[];
  widget: WidgetConfig;
  onChange: (patch: Partial<WidgetConfig>) => void;
  derivedFields?: DerivedField[];
  baseColumns?: ColumnMeta[];
  onDerivedFieldsChange?: (fields: DerivedField[]) => void | Promise<void>;
}

function patchQuery(
  widget: WidgetConfig,
  patch: Partial<WidgetDataQuery>
): Partial<WidgetConfig> {
  const next: WidgetDataQuery = {
    ...EMPTY_WIDGET_DATA_QUERY,
    ...widget.dataQuery,
    ...patch,
  };
  return {
    dataQuery: next,
    categoryKey: next.groupByKey ?? widget.categoryKey,
    valueKey: next.measureKey ?? widget.valueKey,
    aggregation: next.aggregation,
  };
}

function Section({
  title,
  icon: Icon,
  hint,
  optional,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 text-xs font-semibold text-slate-800">
          {title}
          {optional && (
            <span className="ml-1.5 font-normal text-slate-400">(optional)</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
          {hint && <p className="mb-2.5 text-[11px] leading-relaxed text-slate-500">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

export const WidgetDataConfigurator = forwardRef<
  WidgetDataConfiguratorHandle,
  WidgetDataConfiguratorProps
>(function WidgetDataConfigurator(
  {
    data,
    primaryData,
    dbDatasets,
    availableTables = [],
    tableRelations,
    widget,
    onChange,
    derivedFields = [],
    baseColumns,
    onDerivedFieldsChange,
  },
  ref
) {
  const derivedQuickAddRef = useRef<DerivedColumnQuickAddHandle>(null);
  const q: WidgetDataQuery = { ...EMPTY_WIDGET_DATA_QUERY, ...widget.dataQuery };
  const shape = widget.visualShape ? getShapeDef(widget.visualShape) : undefined;
  const columns = getColumnOptions(data.columns);
  const derivedKeys = new Set(derivedFields.map((f) => f.key));
  const categoryCols = columns.filter((c) => c.type === "category" || c.type === "text");
  const numericCols = columns.filter((c) => c.type === "number");
  const allCols = columns.filter((c) => c.key.trim());
  const needsGroupBy = shape?.needsGroupBy === true;
  const needsAggregation = shape?.needsAggregation === true;
  const isTable = widget.visualShape === "table";
  const isRanking = widget.visualShape === "ranking";
  const needsMeasure = needsAggregation && q.aggregation !== "count";
  const selectedColumns = q.displayColumns ?? [];
  const hiddenDerivedFields = derivedFields.filter((f) => !selectedColumns.includes(f.key));

  const sheetDataForTable = (sourceTable: string) =>
    resolveWidgetSheetData(primaryData ?? data, dbDatasets, { sourceTable });

  const toggleColumn = (key: string) => {
    const next = selectedColumns.includes(key)
      ? selectedColumns.filter((k) => k !== key)
      : [...selectedColumns, key];
    onChange(patchQuery(widget, { displayColumns: next }));
  };

  const formulaBaseColumns = baseColumns ?? primaryData?.columns ?? data.columns;
  const derivedSourceLabel =
    widget.sourceTable && availableTables.length > 0
      ? formatDatasetLabel(widget.sourceTable, tableRelations) ||
        formatDbTableLabel(widget.sourceTable)
      : undefined;
  const derivedFieldHint = useMemo(
    () => buildDerivedFieldHelpText(formulaBaseColumns, derivedSourceLabel),
    [formulaBaseColumns, derivedSourceLabel]
  );

  const handleAddDerivedField = async (field: DerivedField) => {
    if (!onDerivedFieldsChange) return;
    if (derivedFields.some((f) => f.key === field.key)) return;
    const next = [...derivedFields, field];
    await onDerivedFieldsChange(next);
    if (isTable) {
      const cols = selectedColumns.includes(field.key)
        ? selectedColumns
        : [...selectedColumns, field.key];
      onChange(patchQuery(widget, { displayColumns: cols }));
    } else if (needsMeasure) {
      onChange(patchQuery(widget, { measureKey: field.key }));
    } else if (needsGroupBy && !q.groupByKey) {
      onChange(patchQuery(widget, { groupByKey: field.key }));
    }
  };

  useImperativeHandle(ref, () => ({
    commitPendingDerivedField: async () => {
      if (!onDerivedFieldsChange) return {};
      const pending = derivedQuickAddRef.current?.commitPendingDraft();
      if (!pending) return {};
      if ("error" in pending) return { error: pending.error };
      if (derivedFields.some((f) => f.key === pending.key)) {
        return { error: `Kolom custom "${pending.key}" sudah ada di project` };
      }
      await handleAddDerivedField(pending);
      derivedQuickAddRef.current?.resetAfterCommit();
      const cols = isTable
        ? selectedColumns.includes(pending.key)
          ? selectedColumns
          : [...selectedColumns, pending.key]
        : selectedColumns;
      const widgetPatch = isTable
        ? patchQuery(widget, { displayColumns: cols })
        : needsMeasure
          ? patchQuery(widget, { measureKey: pending.key })
          : needsGroupBy && !q.groupByKey
            ? patchQuery(widget, { groupByKey: pending.key })
            : undefined;
      return widgetPatch ? { widgetPatch } : {};
    },
  }));

  const handleRemoveDerivedField = async (field: DerivedField) => {
    if (!onDerivedFieldsChange) return;
    const next = derivedFields.filter((f) => f.id !== field.id);
    await onDerivedFieldsChange(next);

    const queryPatch: Partial<WidgetDataQuery> = {};
    if (selectedColumns.includes(field.key)) {
      queryPatch.displayColumns = selectedColumns.filter((k) => k !== field.key);
    }
    if (q.measureKey === field.key) queryPatch.measureKey = undefined;
    if (q.groupByKey === field.key) queryPatch.groupByKey = undefined;
    if (q.sort?.columnKey === field.key) queryPatch.sort = null;
    if (Object.keys(queryPatch).length > 0) {
      onChange(patchQuery(widget, queryPatch));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-blue-900">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        <div>
          <strong className="font-semibold">How it works:</strong> options below apply only to
          this widget. Check the live preview on the right.
          <p className="mt-1 text-blue-800/80">{widgetPreviewSummary(data, widget)}</p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">Widget title</span>
        <input
          value={widget.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Total Sales"
          className="input-field text-sm"
        />
      </label>

      {onDerivedFieldsChange && (
        <Section
          title="Kolom dihitung"
          icon={Calculator}
          hint={`${derivedFieldHint} Kolom baru otomatis ditambahkan ke widget tabel ini setelah disimpan.`}
          defaultOpen={false}
        >
          <DerivedColumnQuickAdd
            ref={derivedQuickAddRef}
            baseColumns={formulaBaseColumns}
            sourceLabel={derivedSourceLabel}
            fields={derivedFields}
            validationData={{ columns: formulaBaseColumns, rows: data.rows }}
            onAdd={(field) => void handleAddDerivedField(field)}
            onRemove={(field) => void handleRemoveDerivedField(field)}
          />
        </Section>
      )}

      {availableTables.length > 1 && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Sumber tabel</span>
          <DbTableSelect
            value={widget.sourceTable ?? availableTables[0] ?? ""}
            onChange={(nextTable) => {
              const nextData = sheetDataForTable(nextTable);
              const allColumnKeys = isTable
                ? defaultTableDisplayColumns(nextData.columns)
                : undefined;
              onChange({
                sourceTable: nextTable,
                categoryKey: undefined,
                valueKey: undefined,
                dataQuery: {
                  ...EMPTY_WIDGET_DATA_QUERY,
                  limit: widget.dataQuery?.limit ?? 12,
                  ...(isTable
                    ? {
                        displayColumns: allColumnKeys,
                        sort: allColumnKeys?.[0]
                          ? { columnKey: allColumnKeys[0], direction: "asc" as const }
                          : null,
                      }
                    : {}),
                },
              });
            }}
            tables={availableTables}
            formatLabel={(table) =>
              formatDatasetLabel(table, tableRelations) || formatDbTableLabel(table)
            }
            size="md"
            className="w-full"
            ariaLabel="Sumber tabel widget"
          />
        </label>
      )}

      {!isForcedFullWidth(widget) && (
        <Section
          title="Dashboard size"
          icon={LayoutGrid}
          hint="Full width uses the entire row. Half width lets widgets sit side by side (tables always use full width)."
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-2">
            {(["full", "half"] as const).map((width) => {
              const active = getWidgetLayoutWidth(widget) === width;
              return (
                <button
                  key={width}
                  type="button"
                  onClick={() => onChange({ layoutWidth: width })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {layoutWidthLabel(width)}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {needsGroupBy && (
        <Section
          title="Group by"
          icon={Layers}
          hint="Pick the column that defines each bar, slice, or row group."
        >
          <select
            value={q.groupByKey ?? ""}
            onChange={(e) => onChange(patchQuery(widget, { groupByKey: e.target.value || undefined }))}
            className="input-field text-xs"
          >
            <option value="">Select column…</option>
            {categoryCols.map((c) => (
              <option key={c.key} value={c.key}>
                {c.businessLabel ?? c.label}
              </option>
            ))}
          </select>
        </Section>
      )}

      {needsAggregation && (
        <Section
          title="Calculate"
          icon={Calculator}
          hint={
            widget.visualShape === "stat"
              ? "Choose how to summarize your data into one number. Kolom custom dari widget builder atau Pengaturan project tersedia di dropdown."
              : "How to aggregate values within each group. Buat kolom custom di atas atau di Pengaturan project."
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={q.aggregation}
              onChange={(e) =>
                onChange(
                  patchQuery(widget, {
                    aggregation: e.target.value as WidgetDataQuery["aggregation"],
                  })
                )
              }
              className="input-field text-xs"
            >
              {Object.entries(AGGREGATION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            {needsMeasure && (
              <select
                value={q.measureKey ?? ""}
                onChange={(e) =>
                  onChange(patchQuery(widget, { measureKey: e.target.value || undefined }))
                }
                className="input-field text-xs"
              >
                <option value="">Numeric column…</option>
                {numericCols.map((c) => (
                  <option key={c.key} value={c.key}>
                    {derivedKeys.has(c.key) ? `${c.businessLabel ?? c.label} (custom)` : c.businessLabel ?? c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Section>
      )}

      {isTable && hiddenDerivedFields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-violet-900">
            Kolom dihitung belum ditampilkan:{" "}
            <strong className="font-semibold">
              {hiddenDerivedFields.map((f) => f.name).join(", ")}
            </strong>
          </p>
          <button
            type="button"
            onClick={() =>
              onChange(
                patchQuery(widget, {
                  displayColumns: [
                    ...selectedColumns,
                    ...hiddenDerivedFields.map((f) => f.key).filter((k) => !selectedColumns.includes(k)),
                  ],
                })
              )
            }
            className="shrink-0 rounded-lg border border-violet-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
          >
            Tampilkan di tabel
          </button>
        </div>
      )}

      {isTable && (
        <Section
          title="Columns to show"
          icon={Table2}
          hint="Pilih kolom yang ditampilkan. Kolom ungu bertanda custom = kolom dihitung. Tinggi panel menyesuaikan jumlah baris."
        >
          <div className="flex flex-wrap gap-1.5">
            {allCols.map((c) => {
              const on = selectedColumns.includes(c.key);
              const isCustom = derivedKeys.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleColumn(c.key)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    on
                      ? isCustom
                        ? "border-violet-400 bg-violet-100 text-violet-800"
                        : "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : isCustom
                        ? "border-violet-200 bg-violet-50/80 text-violet-700 hover:border-violet-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {c.label}
                  {isCustom && <span className="ml-1 text-[9px] opacity-70">custom</span>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {isTable && (
        <Section
          title="Summary row"
          icon={Calculator}
          hint="Optional footer with average, sum, min, max, or count. Calculated from all matching rows, not just the current page."
          defaultOpen={!!q.tableSummary?.enabled}
        >
          <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={q.tableSummary?.enabled ?? false}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange(
                    patchQuery(widget, {
                      tableSummary: {
                        enabled: true,
                        aggregation: "avg",
                        scope: "all_numeric",
                        label: "Average",
                      },
                    })
                  );
                } else {
                  onChange(patchQuery(widget, { tableSummary: undefined }));
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
            />
            Show summary row at the bottom
          </label>

          {q.tableSummary?.enabled && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-slate-600">
                    Calculation
                  </span>
                  <select
                    value={q.tableSummary.aggregation}
                    onChange={(e) => {
                      const aggregation = e.target.value as WidgetDataQuery["aggregation"];
                      onChange(
                        patchQuery(widget, {
                          tableSummary: {
                            ...q.tableSummary!,
                            aggregation,
                            label: AGGREGATION_LABELS[aggregation],
                          },
                        })
                      );
                    }}
                    className="input-field text-xs"
                  >
                    {(["avg", "sum", "min", "max", "count"] as const).map((agg) => (
                      <option key={agg} value={agg}>
                        {AGGREGATION_LABELS[agg]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-slate-600">
                    Apply to
                  </span>
                  <select
                    value={q.tableSummary.scope}
                    onChange={(e) => {
                      const scope = e.target.value as "all_numeric" | "selected";
                      const defaultKeys = numericCols
                        .filter(
                          (c) =>
                            selectedColumns.length === 0 || selectedColumns.includes(c.key)
                        )
                        .map((c) => c.key);
                      onChange(
                        patchQuery(widget, {
                          tableSummary: {
                            ...q.tableSummary!,
                            scope,
                            columnKeys: scope === "selected" ? defaultKeys : undefined,
                          },
                        })
                      );
                    }}
                    className="input-field text-xs"
                  >
                    <option value="all_numeric">All numeric columns</option>
                    <option value="selected">Pick specific columns</option>
                  </select>
                </div>
              </div>

              {q.tableSummary.scope === "selected" && (
                <div className="flex flex-wrap gap-1.5">
                  {numericCols
                    .filter(
                      (c) =>
                        selectedColumns.length === 0 || selectedColumns.includes(c.key)
                    )
                    .map((c) => {
                      const keys = q.tableSummary?.columnKeys ?? [];
                      const on = keys.includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? keys.filter((k) => k !== c.key)
                              : [...keys, c.key];
                            onChange(
                              patchQuery(widget, {
                                tableSummary: { ...q.tableSummary!, columnKeys: next },
                              })
                            );
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            on
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                </div>
              )}

              <div>
                <span className="mb-1 block text-[11px] font-medium text-slate-600">
                  Label (first column)
                </span>
                <input
                  value={q.tableSummary.label ?? ""}
                  onChange={(e) =>
                    onChange(
                      patchQuery(widget, {
                        tableSummary: { ...q.tableSummary!, label: e.target.value },
                      })
                    )
                  }
                  placeholder="e.g. Average"
                  className="input-field text-xs"
                />
              </div>
            </div>
          )}
        </Section>
      )}

      {(isRanking || isTable || needsGroupBy) && (
        <Section
          title={isTable ? "Sort" : "Sort & limit"}
          icon={ArrowUpDown}
          hint={
            isRanking
              ? "Which column to rank by and how many items to show."
              : isTable
                ? "Optional column sort order."
                : "Optional ordering and max rows shown."
          }
          defaultOpen={isRanking}
        >
          <div className={cn("grid gap-2", isTable ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            <select
              value={q.sort?.columnKey ?? ""}
              onChange={(e) =>
                onChange(
                  patchQuery(widget, {
                    sort: e.target.value
                      ? { columnKey: e.target.value, direction: q.sort?.direction ?? "desc" }
                      : null,
                  })
                )
              }
              className="input-field text-xs sm:col-span-1"
            >
              <option value="">{isRanking ? "Sort column…" : "Default order"}</option>
              {[...categoryCols, ...numericCols].map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={q.sort?.direction ?? "desc"}
              disabled={!q.sort?.columnKey}
              onChange={(e) =>
                onChange(
                  patchQuery(widget, {
                    sort: q.sort
                      ? { ...q.sort, direction: e.target.value as "asc" | "desc" }
                      : null,
                  })
                )
              }
              className="input-field text-xs"
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>
            {!isTable && (
              <select
                value={String(q.limit ?? 12)}
                onChange={(e) =>
                  onChange(patchQuery(widget, { limit: parseInt(e.target.value, 10) }))
                }
                className="input-field text-xs"
              >
                {[5, 10, 12, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    Show {n}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Section>
      )}

      <Section
        title="Filters"
        icon={Filter}
        optional
        defaultOpen={q.conditions.length > 0}
        hint="Narrow rows before calculating — like Excel filters."
      >
        <div className="space-y-2">
          {q.conditions.length === 0 && (
            <p className="text-[11px] text-slate-400">No filters — all rows are included.</p>
          )}
          {q.conditions.map((cond) => {
            const col = columns.find((c) => c.key === cond.columnKey);
            const ops = operatorsForColumn(col);
            const options =
              col && col.type === "category" ? getDistinctValues(data.rows, col.key, 30) : [];
            return (
              <div
                key={cond.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <select
                  value={cond.columnKey}
                  onChange={(e) => {
                    const nextCol = columns.find((c) => c.key === e.target.value);
                    onChange(
                      patchQuery(widget, {
                        conditions: q.conditions.map((c) =>
                          c.id === cond.id
                            ? {
                                ...c,
                                columnKey: e.target.value,
                                operator: defaultOperatorForType(nextCol?.type ?? "text"),
                                value: "",
                              }
                            : c
                        ),
                      })
                    );
                  }}
                  className="input-field min-w-[110px] flex-1 py-1.5 text-xs"
                >
                  <option value="">Column…</option>
                  {columns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.businessLabel ?? c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    onChange(
                      patchQuery(widget, {
                        conditions: q.conditions.map((c) =>
                          c.id === cond.id
                            ? { ...c, operator: e.target.value as typeof c.operator }
                            : c
                        ),
                      })
                    )
                  }
                  disabled={!cond.columnKey}
                  className="input-field min-w-[110px] flex-1 py-1.5 text-xs"
                >
                  {ops.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
                {operatorNeedsValue(cond.operator) &&
                  (options.length > 0 ? (
                    <select
                      value={cond.value}
                      onChange={(e) =>
                        onChange(
                          patchQuery(widget, {
                            conditions: q.conditions.map((c) =>
                              c.id === cond.id ? { ...c, value: e.target.value } : c
                            ),
                          })
                        )
                      }
                      className="input-field min-w-[110px] flex-1 py-1.5 text-xs"
                    >
                      <option value="">Value…</option>
                      {options.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={cond.value}
                      onChange={(e) =>
                        onChange(
                          patchQuery(widget, {
                            conditions: q.conditions.map((c) =>
                              c.id === cond.id ? { ...c, value: e.target.value } : c
                            ),
                          })
                        )
                      }
                      placeholder="Value…"
                      className="input-field min-w-[110px] flex-1 py-1.5 text-xs"
                    />
                  ))}
                {operatorNeedsSecondValue(cond.operator) && (
                  <input
                    value={cond.valueTo ?? ""}
                    onChange={(e) =>
                      onChange(
                        patchQuery(widget, {
                          conditions: q.conditions.map((c) =>
                            c.id === cond.id ? { ...c, valueTo: e.target.value } : c
                          ),
                        })
                      )
                    }
                    placeholder="To…"
                    className="input-field w-20 py-1.5 text-xs"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      patchQuery(widget, {
                        conditions: q.conditions.filter((c) => c.id !== cond.id),
                      })
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(
              patchQuery(widget, {
                conditions: [...q.conditions, createCondition(columns[0]?.key ?? "")],
              })
            )
          }
          className="btn-ghost mt-2 w-full justify-center border border-dashed border-slate-200 py-1.5 text-[11px]"
        >
          <Plus className="h-3 w-3" />
          Add filter
        </button>
      </Section>
    </div>
  );
});
