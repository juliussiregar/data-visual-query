import type { DashboardLayout, SheetData, WidgetVisualShape } from "./types";
import { createDefaultLayout } from "./layout";
import { createWidgetFromShape } from "./widget-catalog";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  shapes: WidgetVisualShape[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "kpi-chart",
    name: "KPI + chart",
    description: "One headline number and a category bar chart",
    shapes: ["stat", "bar"],
  },
  {
    id: "table-donut",
    name: "Table + donut",
    description: "Scrollable data table with a share breakdown chart",
    shapes: ["table", "donut"],
  },
  {
    id: "executive",
    name: "Executive pack",
    description: "Two KPIs, a chart, and a top list",
    shapes: ["stat", "stat", "bar", "ranking"],
  },
];

function customizeWidget(
  widget: ReturnType<typeof createWidgetFromShape>,
  shape: WidgetVisualShape,
  index: number,
  templateId: string
) {
  if (templateId === "executive" && shape === "stat") {
    if (index === 0) {
      return {
        ...widget,
        title: "Total",
        dataQuery: widget.dataQuery
          ? { ...widget.dataQuery, aggregation: "sum" as const }
          : widget.dataQuery,
      };
    }
    if (index === 1) {
      return {
        ...widget,
        title: "Row count",
        dataQuery: widget.dataQuery
          ? { ...widget.dataQuery, aggregation: "count" as const }
          : widget.dataQuery,
      };
    }
  }
  return widget;
}

export function buildLayoutFromTemplate(
  templateId: string,
  data: SheetData,
  sheetUrls: string[]
): DashboardLayout | null {
  const template = DASHBOARD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const base = createDefaultLayout(sheetUrls);
  const widgets = template.shapes.map((shape, index) => {
    const raw = createWidgetFromShape(shape, data, index);
    const widget = customizeWidget(raw, shape, index, templateId);
    return { ...widget, order: index + 1, visible: true };
  });

  return {
    ...base,
    widgets,
    updatedAt: new Date().toISOString(),
  };
}
