import type { SheetData, WidgetConfig } from "./types";
import { formatDbTableLabel as formatTableLabel } from "./data-source-labels";

export function normalizeActiveDbTables(tables: string[]): string[] {
  return [...new Set(tables.map((t) => t.trim()).filter(Boolean))];
}

export function resolveProjectDbTables(project: {
  activeDbTables?: string[];
  activeDbTable?: string | null;
}): string[] {
  const fromArray = normalizeActiveDbTables(project.activeDbTables ?? []);
  if (fromArray.length > 0) return fromArray;
  const legacy = project.activeDbTable?.trim();
  return legacy ? [legacy] : [];
}

export function syncLegacyActiveDbTable(tables: string[]): string | null {
  return tables[0] ?? null;
}

export function resolveWidgetSheetData(
  primary: SheetData,
  datasets: Record<string, SheetData> | null | undefined,
  widget: Pick<WidgetConfig, "sourceTable">
): SheetData {
  const key = widget.sourceTable?.trim();
  if (key && datasets?.[key]) return datasets[key];
  return primary;
}

export { formatTableLabel as formatDbTableLabel };
