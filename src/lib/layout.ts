import type { DashboardLayout, SheetData, WidgetConfig, WidgetType } from "./types";

export function layoutKeyFromUrls(urls: string[]): string {
  const normalized = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].sort();
  return normalized.join("||");
}

export function hashLayoutKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return `lk_${Math.abs(hash).toString(36)}`;
}

export function createDefaultLayout(sheetUrls: string[], data: SheetData): DashboardLayout {
  const featuredChart =
    data.charts.find((c) => c.featured)?.id ?? data.charts[0]?.id;

  const widgets: WidgetConfig[] = [
    { id: "widget-kpis", type: "kpis", visible: true, order: 0, span: 3 },
    {
      id: "widget-hero-chart",
      type: "hero_chart",
      visible: true,
      order: 1,
      span: 2,
      chartId: featuredChart,
    },
    { id: "widget-distribution", type: "distribution", visible: true, order: 2, span: 1 },
    { id: "widget-top-records", type: "top_records", visible: true, order: 3, span: 1 },
    { id: "widget-insights", type: "insights", visible: true, order: 4, span: 1 },
  ];

  data.charts.slice(0, 4).forEach((chart, i) => {
    widgets.push({
      id: `widget-chart-${chart.id}`,
      type: "chart",
      visible: i < 2,
      order: 10 + i,
      span: 1,
      chartId: chart.id,
      chartType: chart.type,
      categoryKey: chart.categoryKey,
      valueKey: chart.valueKey,
      aggregation: chart.aggregation,
      title: chart.title,
    });
  });

  const defaultVisible = new Set([
    "widget-kpis",
    "widget-hero-chart",
    "widget-insights",
    ...(data.distributions.length > 0 ? ["widget-distribution"] : []),
    ...widgets
      .filter((w) => w.type === "chart" && w.chartId?.startsWith("metric-"))
      .slice(0, 1)
      .map((w) => w.id),
  ]);

  return {
    version: 1,
    sheetUrls,
    mergeMode: sheetUrls.length > 1,
    widgets: widgets
      .sort((a, b) => a.order - b.order)
      .map((w) => ({
        ...w,
        visible: defaultVisible.has(w.id),
      })),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeLayoutWithData(
  layout: DashboardLayout,
  data: SheetData
): DashboardLayout {
  const existingChartIds = new Set(
    layout.widgets.filter((w) => w.type === "chart").map((w) => w.chartId)
  );
  const next = [...layout.widgets];
  let maxOrder = Math.max(0, ...next.map((w) => w.order));

  for (const chart of data.charts) {
    if (existingChartIds.has(chart.id)) continue;
    maxOrder += 1;
    next.push({
      id: `widget-chart-${chart.id}`,
      type: "chart",
      visible: false,
      order: maxOrder,
      span: 1,
      chartId: chart.id,
      chartType: chart.type,
      categoryKey: chart.categoryKey,
      valueKey: chart.valueKey,
      aggregation: chart.aggregation,
      title: chart.title,
    });
  }

  return {
    ...layout,
    sheetUrls: layout.sheetUrls.length ? layout.sheetUrls : [data.sourceUrl.split(" | ")[0] ?? data.sourceUrl],
    widgets: next.sort((a, b) => a.order - b.order),
  };
}

export function getVisibleWidgets(layout: DashboardLayout): WidgetConfig[] {
  return layout.widgets.filter((w) => w.visible).sort((a, b) => a.order - b.order);
}

export function getHiddenWidgets(layout: DashboardLayout): WidgetConfig[] {
  return layout.widgets.filter((w) => !w.visible).sort((a, b) => a.order - b.order);
}

export function widgetLabel(widget: WidgetConfig, data?: SheetData): string {
  if (widget.title) return widget.title;
  switch (widget.type) {
    case "kpis":
      return "KPI Cards";
    case "hero_chart":
      return "Grafik Utama";
    case "distribution":
      return "Distribusi Status";
    case "top_records":
      return "Top Records";
    case "insights":
      return "Insights";
    case "chart": {
      const chart = data?.charts.find((c) => c.id === widget.chartId);
      return chart?.title ?? widget.chartId ?? "Grafik";
    }
    default:
      return widget.id;
  }
}

export function updateWidget(
  layout: DashboardLayout,
  widgetId: string,
  patch: Partial<WidgetConfig>
): DashboardLayout {
  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    widgets: layout.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
  };
}

export function addWidgetFromType(
  layout: DashboardLayout,
  widgetId: string
): DashboardLayout {
  const target = layout.widgets.find((w) => w.id === widgetId);
  if (!target) return layout;
  return updateWidget(layout, widgetId, { visible: true });
}

export function removeWidget(layout: DashboardLayout, widgetId: string): DashboardLayout {
  return updateWidget(layout, widgetId, { visible: false });
}

export function reorderWidget(
  layout: DashboardLayout,
  widgetId: string,
  direction: "up" | "down"
): DashboardLayout {
  const sorted = [...layout.widgets].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((w) => w.id === widgetId);
  if (idx < 0) return layout;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return layout;

  const a = sorted[idx];
  const b = sorted[swapIdx];
  const widgets = layout.widgets.map((w) => {
    if (w.id === a.id) return { ...w, order: b.order };
    if (w.id === b.id) return { ...w, order: a.order };
    return w;
  });

  return { ...layout, updatedAt: new Date().toISOString(), widgets };
}

/** Reorder visible widget by drag-drop (insert before targetId). */
export function dragReorderWidget(
  layout: DashboardLayout,
  draggedId: string,
  targetId: string
): DashboardLayout {
  if (draggedId === targetId) return layout;

  const visible = layout.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);
  const fromIdx = visible.findIndex((w) => w.id === draggedId);
  const toIdx = visible.findIndex((w) => w.id === targetId);
  if (fromIdx < 0 || toIdx < 0) return layout;

  const reordered = [...visible];
  const [moved] = reordered.splice(fromIdx, 1);
  reordered.splice(toIdx, 0, moved);

  const orderMap = new Map(reordered.map((w, i) => [w.id, i]));
  const hidden = layout.widgets.filter((w) => !w.visible);
  const hiddenStart = reordered.length;

  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    widgets: layout.widgets.map((w) => {
      if (orderMap.has(w.id)) {
        return { ...w, order: orderMap.get(w.id)! };
      }
      const hiddenIdx = hidden.findIndex((h) => h.id === w.id);
      return { ...w, order: hiddenStart + hiddenIdx };
    }),
  };
}

export type LayoutTemplateId = "ringkas" | "manajemen" | "presentasi";

export const LAYOUT_TEMPLATES: {
  id: LayoutTemplateId;
  label: string;
  description: string;
}[] = [
  {
    id: "ringkas",
    label: "Ringkas",
    description: "KPI + grafik utama saja",
  },
  {
    id: "manajemen",
    label: "Manajemen",
    description: "KPI, distribusi, ranking, insights",
  },
  {
    id: "presentasi",
    label: "Presentasi",
    description: "Visual menonjol untuk meeting",
  },
];

export function suggestLayoutTemplate(data: SheetData): LayoutTemplateId {
  const chartCount = data.charts.length;
  const hasDistribution = data.distributions.length > 0;
  const hasInsights = data.insights.length >= 2;

  if (chartCount >= 4) return "presentasi";
  if (hasDistribution && hasInsights && chartCount >= 2) return "manajemen";
  return "ringkas";
}

export function applyLayoutTemplate(
  templateId: LayoutTemplateId,
  layout: DashboardLayout,
  data: SheetData
): DashboardLayout {
  const chartWidgets = layout.widgets.filter((w) => w.type === "chart");
  const featuredId =
    data.charts.find((c) => c.featured)?.id ?? data.charts[0]?.id;

  const visibleSet = new Set<string>();

  switch (templateId) {
    case "ringkas":
      visibleSet.add("widget-kpis");
      visibleSet.add("widget-hero-chart");
      break;
    case "manajemen":
      ["widget-kpis", "widget-distribution", "widget-top-records", "widget-insights"].forEach(
        (id) => visibleSet.add(id)
      );
      chartWidgets.slice(0, 1).forEach((w) => visibleSet.add(w.id));
      break;
    case "presentasi":
      ["widget-kpis", "widget-hero-chart", "widget-distribution"].forEach((id) =>
        visibleSet.add(id)
      );
      chartWidgets.slice(0, 3).forEach((w) => visibleSet.add(w.id));
      break;
  }

  const widgets = layout.widgets.map((w) => {
    const visible = visibleSet.has(w.id);
    const patch: Partial<WidgetConfig> = { visible };

    if (w.type === "hero_chart" && featuredId) {
      patch.chartId = featuredId;
    }
    if (templateId === "presentasi" && w.type === "chart" && visible) {
      patch.chartType = w.chartType ?? "donut";
    }
    if (templateId === "manajemen" && w.type === "chart" && visible) {
      patch.chartType = "bar";
    }

    return { ...w, ...patch };
  });

  return {
    ...layout,
    updatedAt: new Date().toISOString(),
    widgets,
  };
}

export function widgetTypeLabel(type: WidgetType): string {
  const labels: Record<WidgetType, string> = {
    kpis: "KPI",
    hero_chart: "Grafik Utama",
    distribution: "Distribusi",
    top_records: "Top Records",
    insights: "Insights",
    chart: "Grafik",
  };
  return labels[type];
}
