import type {
  DashboardLayout,
  SheetData,
  WidgetAggregation,
  WidgetConfig,
  WidgetProposal,
  WidgetProposalCondition,
  WidgetVisualShape,
} from "./types";
import { findColumnKey } from "./chat-actions";
import { createWidgetFromShape, getShapeDef, WIDGET_SHAPES } from "./widget-catalog";
import { validateWidgetConfig } from "./widget-data";
import { widgetLabel } from "./layout";
import { QUERY_OPERATORS, type QueryCondition, type QueryOperator } from "./visual-query";

const SHAPES: WidgetVisualShape[] = [
  "stat",
  "bar",
  "line",
  "donut",
  "distribution",
  "ranking",
  "table",
];

const AGGREGATIONS: WidgetAggregation[] = ["count", "sum", "avg", "min", "max"];

function resolveColumn(ref: string | undefined, columns: SheetData["columns"]): string | undefined {
  if (!ref?.trim()) return undefined;
  return findColumnKey(ref, columns) ?? undefined;
}

function resolveColumns(refs: string[] | undefined, columns: SheetData["columns"]): string[] {
  if (!refs?.length) return [];
  return refs
    .map((ref) => resolveColumn(ref, columns))
    .filter((k): k is string => Boolean(k));
}

function toQueryConditions(
  conditions: WidgetProposalCondition[] | undefined,
  columns: SheetData["columns"]
): QueryCondition[] {
  if (!conditions?.length) return [];
  return conditions
    .map((c, i) => {
      const columnKey = resolveColumn(c.column, columns);
      if (!columnKey) return null;
      const operator = QUERY_OPERATORS.includes(c.operator) ? c.operator : "equals";
      return {
        id: `ai-cond-${i}`,
        columnKey,
        operator,
        value: c.value ?? "",
      };
    })
    .filter((c): c is QueryCondition => c !== null);
}

export function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return structuredClone(layout);
}

/** Cari widget dari judul, id, bentuk visual, atau referensi natural. */
export function findWidgetByRef(
  ref: string,
  layout: DashboardLayout,
  data: SheetData
): WidgetConfig | undefined {
  const r = ref.trim().toLowerCase();
  if (!r) return undefined;

  const widgets = layout.widgets.filter((w) => w.visualShape);

  const byId = widgets.find((w) => w.id.toLowerCase() === r);
  if (byId) return byId;

  const byTitle = widgets.filter((w) => {
    const label = widgetLabel(w, data).toLowerCase();
    return label === r || label.includes(r) || r.includes(label);
  });
  if (byTitle.length === 1) return byTitle[0];
  if (byTitle.length > 1) {
    const visible = byTitle.find((w) => w.visible);
    return visible ?? byTitle[0];
  }

  const shapeDef = WIDGET_SHAPES.find(
    (s) => s.id === r || s.label.toLowerCase() === r || s.label.toLowerCase().includes(r)
  );
  if (shapeDef) {
    const byShape = widgets.filter((w) => w.visualShape === shapeDef.id && w.visible);
    if (byShape.length === 1) return byShape[0];
  }

  if (r.includes("pertama") || r === "first") {
    const visible = widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
    return visible[0];
  }
  if (r.includes("terakhir") || r === "last") {
    const visible = widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
    return visible[visible.length - 1];
  }

  return widgets.find((w) => w.id.toLowerCase().includes(r));
}

export function normalizeWidgetProposal(
  proposal: WidgetProposal,
  layout: DashboardLayout,
  data: SheetData
): WidgetProposal {
  if (proposal.widgetId) return proposal;
  // update/delete: jika widgetRef kosong, pakai title sebagai referensi natural ke widget yang ada.
  const ref =
    proposal.widgetRef?.trim() ||
    (proposal.operation !== "create" ? proposal.title?.trim() : undefined);
  if (!ref) return proposal;
  const found = findWidgetByRef(ref, layout, data);
  if (!found) return proposal;
  return { ...proposal, widgetId: found.id };
}

function applyShapeChange(base: WidgetConfig, newShape: WidgetVisualShape): WidgetConfig {
  const shapeDef = getShapeDef(newShape);
  if (!shapeDef || base.visualShape === newShape) return base;
  return {
    ...base,
    visualShape: newShape,
    type: shapeDef.widgetType,
    chartType: shapeDef.chartType ?? base.chartType,
  };
}

/** Parse satu ATAU banyak proposal. Terima array, objek tunggal, atau null. */
export function parseWidgetProposals(raw: unknown): WidgetProposal[] {
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((item) => parseWidgetProposal(item))
    .filter((p): p is WidgetProposal => p !== null);
}

export function parseWidgetProposal(raw: unknown): WidgetProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const operation = p.operation;
  if (operation !== "create" && operation !== "update" && operation !== "delete") return null;

  const validationQuestion =
    typeof p.validationQuestion === "string" ? p.validationQuestion.trim() : "";
  const summary = typeof p.summary === "string" ? p.summary.trim() : "";
  if (!validationQuestion || !summary) return null;

  let visualShape =
    typeof p.visualShape === "string" && SHAPES.includes(p.visualShape as WidgetVisualShape)
      ? (p.visualShape as WidgetVisualShape)
      : undefined;

  // Fallback: create tanpa visualShape → infer dari field (ada dimensi → bar, hanya measure → stat).
  if (!visualShape && operation === "create") {
    const hasGroup = typeof p.groupByKey === "string" && p.groupByKey.trim().length > 0;
    const hasMeasure = typeof p.measureKey === "string" && p.measureKey.trim().length > 0;
    if (hasGroup) visualShape = "bar";
    else if (hasMeasure) visualShape = "stat";
  }

  const aggregation =
    typeof p.aggregation === "string" && AGGREGATIONS.includes(p.aggregation as WidgetAggregation)
      ? (p.aggregation as WidgetAggregation)
      : undefined;

  let conditions: WidgetProposalCondition[] | undefined;
  if (Array.isArray(p.conditions)) {
    conditions = p.conditions
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => ({
        column: String(c.column ?? ""),
        operator: (QUERY_OPERATORS.includes(c.operator as QueryOperator)
          ? c.operator
          : "equals") as QueryOperator,
        value: String(c.value ?? ""),
      }))
      .filter((c) => c.column.trim());
  }

  return {
    operation,
    widgetId: typeof p.widgetId === "string" ? p.widgetId.trim() : undefined,
    widgetRef: typeof p.widgetRef === "string" ? p.widgetRef.trim() : undefined,
    visualShape,
    title: typeof p.title === "string" ? p.title.trim() : undefined,
    layoutWidth: p.layoutWidth === "full" || p.layoutWidth === "half" ? p.layoutWidth : undefined,
    groupByKey: typeof p.groupByKey === "string" ? p.groupByKey.trim() : undefined,
    measureKey: typeof p.measureKey === "string" ? p.measureKey.trim() : undefined,
    aggregation,
    conditions,
    limit: typeof p.limit === "number" && Number.isFinite(p.limit) ? p.limit : undefined,
    displayColumns: Array.isArray(p.displayColumns)
      ? p.displayColumns.map(String).filter(Boolean)
      : undefined,
    sortColumn: typeof p.sortColumn === "string" ? p.sortColumn.trim() : undefined,
    sortDirection: p.sortDirection === "asc" || p.sortDirection === "desc" ? p.sortDirection : undefined,
    visible: typeof p.visible === "boolean" ? p.visible : undefined,
    validationQuestion,
    summary,
  };
}

export function validateWidgetProposal(
  proposal: WidgetProposal,
  data: SheetData,
  layout: DashboardLayout
): string | null {
  const resolved = normalizeWidgetProposal(proposal, layout, data);

  if (proposal.operation === "delete" || proposal.operation === "update") {
    if (!resolved.widgetId) {
      const ref = proposal.widgetRef ?? proposal.widgetId;
      return ref
        ? `Widget "${ref}" tidak ditemukan. Sebut judul atau id dari layoutWidgets.`
        : "widgetId atau widgetRef wajib untuk update/delete.";
    }
    const exists = layout.widgets.some((w) => w.id === resolved.widgetId);
    if (!exists) return `Widget "${resolved.widgetId}" tidak ditemukan.`;
  }

  if (proposal.operation === "create") {
    if (!proposal.visualShape) return "visualShape wajib untuk widget baru.";
    if (!getShapeDef(proposal.visualShape)) return "Bentuk widget tidak valid.";
  }

  if (proposal.operation !== "delete") {
    const draft = buildWidgetConfigFromProposal(resolved, data, layout);
    if (!draft) return "Konfigurasi widget tidak bisa dibuat dari proposal.";
    const err = validateWidgetConfig(draft, data);
    if (err) return err;
  }

  return null;
}

export function buildWidgetConfigFromProposal(
  proposal: WidgetProposal,
  data: SheetData,
  layout: DashboardLayout
): WidgetConfig | null {
  const columns = data.columns;
  const maxOrder = layout.widgets.reduce((m, w) => Math.max(m, w.order), -1);

  let base: WidgetConfig;
  if (proposal.operation === "update" && proposal.widgetId) {
    const existing = layout.widgets.find((w) => w.id === proposal.widgetId);
    if (!existing) return null;
    base = proposal.visualShape
      ? applyShapeChange({ ...existing }, proposal.visualShape)
      : { ...existing };
  } else if (proposal.operation === "create" && proposal.visualShape) {
    base = createWidgetFromShape(proposal.visualShape, data, maxOrder);
  } else if (proposal.operation === "delete") {
    return null;
  } else {
    return null;
  }

  const groupBy = resolveColumn(proposal.groupByKey, columns) ?? base.dataQuery?.groupByKey ?? base.categoryKey;
  const measure = resolveColumn(proposal.measureKey, columns) ?? base.dataQuery?.measureKey ?? base.valueKey;
  const displayColumns = proposal.displayColumns?.length
    ? resolveColumns(proposal.displayColumns, columns)
    : base.dataQuery?.displayColumns;

  const conditions = toQueryConditions(proposal.conditions, columns);
  const sortColumn = resolveColumn(proposal.sortColumn, columns);

  const dataQuery = {
    ...base.dataQuery!,
    conditions: conditions.length > 0 ? conditions : base.dataQuery?.conditions ?? [],
    groupByKey: groupBy,
    measureKey: measure,
    aggregation: proposal.aggregation ?? base.dataQuery?.aggregation ?? base.aggregation ?? "count",
    limit: proposal.limit ?? base.dataQuery?.limit,
    displayColumns: displayColumns?.length ? displayColumns : base.dataQuery?.displayColumns,
    sort: sortColumn
      ? {
          columnKey: sortColumn,
          direction: proposal.sortDirection ?? base.dataQuery?.sort?.direction ?? "desc",
        }
      : base.dataQuery?.sort ?? null,
  };

  return {
    ...base,
    title: proposal.title ?? base.title,
    layoutWidth: proposal.layoutWidth ?? base.layoutWidth,
    visible: proposal.visible ?? base.visible,
    visualShape: proposal.visualShape ?? base.visualShape,
    chartType:
      proposal.visualShape && getShapeDef(proposal.visualShape)?.chartType
        ? getShapeDef(proposal.visualShape)!.chartType
        : base.chartType,
    categoryKey: groupBy,
    valueKey: measure,
    aggregation: dataQuery.aggregation,
    dataQuery,
  };
}

export function applyWidgetProposal(
  layout: DashboardLayout,
  data: SheetData,
  proposal: WidgetProposal
): { layout: DashboardLayout; error?: string } {
  const resolved = normalizeWidgetProposal(proposal, layout, data);
  const validationError = validateWidgetProposal(resolved, data, layout);
  if (validationError) return { layout, error: validationError };

  const now = new Date().toISOString();

  if (resolved.operation === "delete" && resolved.widgetId) {
    return {
      layout: {
        ...layout,
        updatedAt: now,
        widgets: layout.widgets.filter((w) => w.id !== resolved.widgetId),
      },
    };
  }

  const widget = buildWidgetConfigFromProposal(resolved, data, layout);
  if (!widget) return { layout, error: "Gagal membangun widget." };

  if (resolved.operation === "create") {
    return {
      layout: {
        ...layout,
        updatedAt: now,
        widgets: [...layout.widgets, widget],
      },
    };
  }

  if (resolved.operation === "update" && resolved.widgetId) {
    return {
      layout: {
        ...layout,
        updatedAt: now,
        widgets: layout.widgets.map((w) => (w.id === resolved.widgetId ? widget : w)),
      },
    };
  }

  return { layout, error: "Operasi widget tidak dikenali." };
}

export function describeWidgetProposal(
  proposal: WidgetProposal,
  columns: SheetData["columns"]
): string {
  const op =
    proposal.operation === "create"
      ? "Tambah"
      : proposal.operation === "update"
        ? "Ubah"
        : "Hapus";
  const shape = proposal.visualShape
    ? getShapeDef(proposal.visualShape)?.label ?? proposal.visualShape
    : "";
  const title = proposal.title ? ` "${proposal.title}"` : "";
  const group = proposal.groupByKey
    ? ` · grup: ${columns.find((c) => c.key === resolveColumn(proposal.groupByKey, columns))?.label ?? proposal.groupByKey}`
    : "";
  return `${op} widget${title}${shape ? ` (${shape})` : ""}${group}`;
}
