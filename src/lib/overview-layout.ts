import type { WidgetConfig } from "./types";
import { getWidgetLayoutWidth } from "./widget-layout";

export type OverviewRow =
  | { kind: "full"; widgets: [WidgetConfig] }
  | { kind: "hero-pair"; widgets: [WidgetConfig, WidgetConfig] }
  | { kind: "grid"; widgets: WidgetConfig[]; statRow?: boolean };

function collectHalfWidthRun(visible: WidgetConfig[], start: number) {
  const first = visible[start];
  const statRow = first.visualShape === "stat";
  const maxInRow = statRow ? 4 : 2;
  const batch: WidgetConfig[] = [first];
  let i = start + 1;

  while (i < visible.length && batch.length < maxInRow) {
    const next = visible[i];
    if (getWidgetLayoutWidth(next) !== "half") break;
    if (statRow && next.visualShape !== "stat") break;
    if (!statRow && next.visualShape === "stat") break;
    batch.push(next);
    i += 1;
  }

  return { batch, nextIndex: i };
}

/** Arrange visible widgets into layout rows based on user order and width prefs. */
export function buildOverviewRows(widgets: WidgetConfig[]): OverviewRow[] {
  const visible = [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
  const rows: OverviewRow[] = [];
  let i = 0;

  while (i < visible.length) {
    const w = visible[i];
    const next = visible[i + 1];

    if (w.type === "kpis" || getWidgetLayoutWidth(w) === "full") {
      rows.push({ kind: "full", widgets: [w] });
      i += 1;
      continue;
    }

    if (w.type === "hero_chart" && next?.type === "distribution") {
      rows.push({ kind: "hero-pair", widgets: [w, next] });
      i += 2;
      continue;
    }

    const { batch, nextIndex } = collectHalfWidthRun(visible, i);
    if (batch.length >= 2) {
      rows.push({
        kind: "grid",
        widgets: batch,
        statRow: batch[0].visualShape === "stat",
      });
    } else {
      rows.push({ kind: "full", widgets: [batch[0]] });
    }
    i = nextIndex;
  }

  return rows;
}
