import type { SheetData } from "./types";
import { analyzeSheetData } from "./analyzer";

export type Filters = Record<string, string>;

export function applyFilters(
  rows: Record<string, string>[],
  filters: Filters
): Record<string, string>[] {
  const active = Object.entries(filters).filter(([, v]) => v);
  if (active.length === 0) return rows;

  return rows.filter((row) =>
    active.every(([key, value]) => row[key]?.trim() === value)
  );
}

export function reanalyze(
  base: SheetData,
  filters: Filters
): SheetData {
  const filtered = applyFilters(base.rows, filters);
  const hasFilters = Object.values(filters).some(Boolean);
  const result = analyzeSheetData(filtered, base.sourceUrl, base.fetchedAt);

  if (base.dataset && hasFilters) {
    result.dataset = {
      ...base.dataset,
      profile: {
        ...base.dataset.profile,
        rowCount: base.rows.length,
        filteredRowCount: filtered.length,
      },
    };
  } else if (base.dataset) {
    result.dataset = base.dataset;
  }

  return result;
}

export function getFilterableColumns(data: SheetData) {
  return data.columns.filter(
    (c) => c.type === "category" && c.uniqueCount >= 2 && c.uniqueCount <= 20
  );
}
