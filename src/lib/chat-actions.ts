import type { ChartType, DashboardAction, DashboardLayout, ViewId } from "./types";

export type { DashboardAction, DashboardContext } from "./types";

export function findColumnKey(
  columnRef: string,
  columns: { key: string; label: string }[]
): string | null {
  const ref = columnRef.trim().toLowerCase();
  const exact = columns.find(
    (c) => c.key.toLowerCase() === ref || c.label.toLowerCase() === ref
  );
  if (exact) return exact.key;

  const partial = columns.find(
    (c) =>
      c.key.toLowerCase().includes(ref) ||
      c.label.toLowerCase().includes(ref) ||
      ref.includes(c.label.toLowerCase())
  );
  return partial?.key ?? null;
}

export function findWidgetByChartId(
  layout: DashboardLayout,
  chartId: string
): string | null {
  const w = layout.widgets.find(
    (widget) =>
      widget.chartId === chartId ||
      widget.id === `widget-chart-${chartId}` ||
      widget.id === chartId
  );
  return w?.id ?? null;
}

export function applyLayoutActions(
  layout: DashboardLayout,
  actions: DashboardAction[],
  columns: { key: string; label: string }[]
): DashboardLayout {
  let next = layout;

  for (const action of actions) {
    switch (action.type) {
      case "set_widget_visibility": {
        next = {
          ...next,
          updatedAt: new Date().toISOString(),
          widgets: next.widgets.map((w) =>
            w.id === action.widgetId ? { ...w, visible: action.visible } : w
          ),
        };
        break;
      }
      case "set_chart_type": {
        const widgetId = findWidgetByChartId(next, action.chartId);
        if (widgetId) {
          next = {
            ...next,
            updatedAt: new Date().toISOString(),
            widgets: next.widgets.map((w) =>
              w.id === widgetId ? { ...w, chartType: action.chartType, visible: true } : w
            ),
          };
        }
        break;
      }
      case "set_chart_columns": {
        const widgetId = findWidgetByChartId(next, action.chartId);
        const categoryKey =
          findColumnKey(action.categoryKey, columns) ?? action.categoryKey;
        const valueKey = action.valueKey
          ? findColumnKey(action.valueKey, columns) ?? action.valueKey
          : undefined;
        if (widgetId) {
          next = {
            ...next,
            updatedAt: new Date().toISOString(),
            widgets: next.widgets.map((w) =>
              w.id === widgetId
                ? {
                    ...w,
                    visible: true,
                    categoryKey,
                    valueKey,
                    aggregation: action.aggregation ?? w.aggregation,
                  }
                : w
            ),
          };
        }
        break;
      }
      case "reorder_widget":
        next = {
          ...next,
          updatedAt: new Date().toISOString(),
          widgets: next.widgets.map((w) =>
            w.id === action.widgetId ? { ...w, order: action.order } : w
          ),
        };
        break;
      case "set_merge_mode":
        next = { ...next, mergeMode: action.enabled, updatedAt: new Date().toISOString() };
        break;
      case "add_sheet":
        if (!next.sheetUrls.includes(action.url)) {
          next = {
            ...next,
            sheetUrls: [...next.sheetUrls, action.url],
            mergeMode: next.sheetUrls.length >= 1,
            updatedAt: new Date().toISOString(),
          };
        }
        break;
      case "remove_sheet":
        next = {
          ...next,
          sheetUrls: next.sheetUrls.filter((u) => u !== action.url),
          mergeMode: next.sheetUrls.length > 2,
          updatedAt: new Date().toISOString(),
        };
        break;
      case "reset_layout":
        break;
      default:
        break;
    }
  }

  return next;
}

export function describeAction(
  action: DashboardAction,
  columns: { key: string; label: string }[]
): string {
  switch (action.type) {
    case "set_view": {
      const labels: Record<ViewId, string> = {
        overview: "Overview",
        charts: "Grafik",
        insights: "Insights",
        data: "Tabel Data",
        columns: "Profil Kolom",
      };
      return `Buka ${labels[action.view]}`;
    }
    case "set_filter": {
      const key = findColumnKey(action.column, columns);
      const label = columns.find((c) => c.key === key)?.label ?? action.column;
      return `Filter ${label}: ${action.value}`;
    }
    case "set_filters":
      return `Terapkan ${Object.keys(action.filters).length} filter`;
    case "clear_filters":
      return "Reset semua filter";
    case "set_widget_visibility":
      return `${action.visible ? "Tampilkan" : "Sembunyikan"} widget ${action.widgetId}`;
    case "set_chart_type":
      return `Ubah grafik ${action.chartId} ke ${action.chartType}`;
    case "set_chart_columns":
      return `Ubah kolom grafik ${action.chartId}`;
    case "reorder_widget":
      return `Urutkan widget ${action.widgetId}`;
    case "add_sheet":
      return "Tambah sheet ke gabungan";
    case "remove_sheet":
      return "Hapus sheet dari gabungan";
    case "set_merge_mode":
      return action.enabled ? "Aktifkan gabung sheet" : "Matikan gabung sheet";
    case "reset_layout":
      return "Reset layout default";
    default:
      return "Update dashboard";
  }
}
