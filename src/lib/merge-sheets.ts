import { analyzeSheetData } from "./analyzer";
import type { ColumnMeta, SheetData } from "./types";

const SOURCE_COL = "_sheet";

export function mergeSheetDataSet(
  datasets: SheetData[],
  urlLabels?: Record<string, string>
): SheetData {
  if (datasets.length === 0) {
    throw new Error("Tidak ada data sheet untuk digabungkan");
  }
  if (datasets.length === 1) return datasets[0];

  const allKeys = new Set<string>();
  for (const ds of datasets) {
    for (const col of ds.columns) allKeys.add(col.key);
    allKeys.add(SOURCE_COL);
  }

  const mergedRows: Record<string, string>[] = [];
  for (const ds of datasets) {
    const label = urlLabels?.[ds.sourceUrl] ?? ds.dataset?.name ?? "Google Sheet";
    for (const row of ds.rows) {
      const merged: Record<string, string> = { [SOURCE_COL]: label };
      for (const key of allKeys) {
        if (key === SOURCE_COL) continue;
        merged[key] = row[key] ?? "";
      }
      mergedRows.push(merged);
    }
  }

  const sourceUrls = datasets.map((d) => d.sourceUrl).join(" | ");
  const fetchedAt = datasets[0]?.fetchedAt ?? new Date().toISOString();
  const mergeName = datasets
    .map((d) => urlLabels?.[d.sourceUrl] ?? d.dataset?.name ?? "Google Sheet")
    .join(" + ");
  return analyzeSheetData(mergedRows, sourceUrls, fetchedAt, {
    mergeMode: true,
    displayName: mergeName,
  });
}

export function getMergeSourceColumn(columns: ColumnMeta[]): ColumnMeta | undefined {
  return columns.find((c) => c.key === SOURCE_COL);
}
