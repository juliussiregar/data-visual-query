import type { WidgetConfig, WidgetType } from "./types";

export type OverviewRow =
  | { kind: "full"; widgets: WidgetConfig[] }
  | { kind: "hero-pair"; widgets: [WidgetConfig, WidgetConfig] }
  | { kind: "grid"; widgets: WidgetConfig[] };

const PAIRABLE: WidgetType[] = ["top_records", "insights", "chart", "distribution"];

function isPairable(type: WidgetType): boolean {
  return PAIRABLE.includes(type);
}

/** Susun widget visible menjadi baris layout yang rapi berdasarkan urutan user. */
export function buildOverviewRows(widgets: WidgetConfig[]): OverviewRow[] {
  const visible = [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
  const rows: OverviewRow[] = [];
  let i = 0;

  while (i < visible.length) {
    const w = visible[i];
    const next = visible[i + 1];

    if (w.type === "kpis") {
      rows.push({ kind: "full", widgets: [w] });
      i += 1;
      continue;
    }

    if (w.type === "hero_chart" && next?.type === "distribution") {
      rows.push({ kind: "hero-pair", widgets: [w, next] });
      i += 2;
      continue;
    }

    if (next && isPairable(w.type) && isPairable(next.type)) {
      rows.push({ kind: "grid", widgets: [w, next] });
      i += 2;
      continue;
    }

    rows.push({ kind: "full", widgets: [w] });
    i += 1;
  }

  return rows;
}
