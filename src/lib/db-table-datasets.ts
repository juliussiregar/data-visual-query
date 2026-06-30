import type { SheetData, WidgetConfig } from "./types";
import { formatDbTableLabel as formatTableLabel, databaseTableFromSourceUrl } from "./data-source-labels";

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

export function resolveLoadedDbTableList(
  data: {
    tables?: string[];
    primaryTable?: string;
    dbSource?: { table?: string };
    sheetUrls?: string[];
  },
  fallbackTables: string[] = []
): string[] {
  if (data.tables?.length) return data.tables;
  if (data.primaryTable?.trim()) return [data.primaryTable.trim()];
  if (data.dbSource?.table?.trim()) return [data.dbSource.table.trim()];
  const fromUrls = (data.sheetUrls ?? [])
    .map(databaseTableFromSourceUrl)
    .filter((t): t is string => Boolean(t));
  if (fromUrls.length > 0) return fromUrls;
  return fallbackTables;
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
