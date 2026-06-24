import { analyzeSheetData } from "./analyzer";
import type { ColumnMeta, SheetData } from "./types";

const SOURCE_COL = "_sheet";

export function mergeSheetDataSet(datasets: SheetData[]): SheetData {
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
    const label = deriveSheetShortLabel(ds.sourceUrl);
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
  return analyzeSheetData(mergedRows, sourceUrls, fetchedAt, { mergeMode: true });
}

function deriveSheetShortLabel(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? `Sheet ${match[1].slice(0, 8)}` : "Sheet";
}

export function getMergeSourceColumn(columns: ColumnMeta[]): ColumnMeta | undefined {
  return columns.find((c) => c.key === SOURCE_COL);
}
