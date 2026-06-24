import { analyzeSheetData } from "./analyzer";
import type { SheetData } from "./types";

const JOIN_SOURCE = "_join_source";

export interface JoinConfig {
  leftKey: string;
  rightKey: string;
  joinType?: "inner" | "left";
}

const JOIN_KEY_CANDIDATES = [
  ["No_Fasilitas", "No_Fasilitas_Referensi"],
  ["no_fasilitas", "no_fasilitas_referensi"],
  ["ID", "ID_Referensi"],
  ["id", "id_referensi"],
];

export function suggestJoinConfig(left: SheetData, right: SheetData): JoinConfig | null {
  for (const [lk, rk] of JOIN_KEY_CANDIDATES) {
    const leftHas = left.columns.some((c) => c.key === lk);
    const rightHas = right.columns.some((c) => c.key === rk);
    if (leftHas && rightHas) return { leftKey: lk, rightKey: rk, joinType: "left" };
  }

  const leftKeys = new Set(left.columns.map((c) => c.key));
  for (const col of right.columns) {
    if (leftKeys.has(col.key) && /referensi|ref|fasilitas|id/i.test(col.key)) {
      return { leftKey: col.key, rightKey: col.key, joinType: "left" };
    }
  }
  return null;
}

export function joinSheetDataSets(
  left: SheetData,
  right: SheetData,
  config: JoinConfig
): SheetData {
  const { leftKey, rightKey, joinType = "left" } = config;
  const rightIndex = new Map<string, Record<string, string>[]>();

  for (const row of right.rows) {
    const key = (row[rightKey] ?? "").trim();
    if (!key) continue;
    const list = rightIndex.get(key) ?? [];
    list.push(row);
    rightIndex.set(key, list);
  }

  const allKeys = new Set<string>();
  for (const col of [...left.columns, ...right.columns]) allKeys.add(col.key);
  allKeys.add(JOIN_SOURCE);

  const mergedRows: Record<string, string>[] = [];
  const matchedRightKeys = new Set<string>();

  for (const leftRow of left.rows) {
    const key = (leftRow[leftKey] ?? "").trim();
    const matches = key ? rightIndex.get(key) : undefined;

    if (matches && matches.length > 0) {
      for (const rightRow of matches) {
        matchedRightKeys.add(key);
        mergedRows.push(mergeRows(leftRow, rightRow, allKeys, "joined"));
      }
    } else if (joinType === "left") {
      mergedRows.push(mergeRows(leftRow, {}, allKeys, "portofolio_only"));
    }
  }

  if (joinType === "inner") {
    // rows already filtered
  }

  const sourceUrls = `${left.sourceUrl} ⨝ ${right.sourceUrl}`;
  const fetchedAt = left.fetchedAt;
  const result = analyzeSheetData(mergedRows, sourceUrls, fetchedAt, {
    mergeMode: false,
    joinMode: true,
  });

  return {
    ...result,
    dataset: result.dataset
      ? {
          ...result.dataset,
          sourceType: "merged",
          name: "Joined dataset",
        }
      : undefined,
  };
}

function mergeRows(
  left: Record<string, string>,
  right: Record<string, string>,
  allKeys: Set<string>,
  source: string
): Record<string, string> {
  const row: Record<string, string> = { [JOIN_SOURCE]: source };
  for (const key of allKeys) {
    if (key === JOIN_SOURCE) continue;
    const lv = left[key];
    const rv = right[key];
    if (lv && rv && lv !== rv && !key.startsWith("_")) {
      row[key] = lv;
      row[`${key}_pengajuan`] = rv;
    } else {
      row[key] = lv ?? rv ?? "";
    }
  }
  return row;
}

export function computeFunnelMetrics(left: SheetData, right: SheetData, config: JoinConfig) {
  const rightStatuses = right.columns.find((c) => /status/i.test(c.key));
  if (!rightStatuses) return null;

  const statusKey = rightStatuses.key;
  const totalPengajuan = right.rows.length;
  const approved = right.rows.filter((r) =>
    /approved|disbursement|akad|setuju/i.test(r[statusKey] ?? "")
  ).length;
  const joined = joinSheetDataSets(left, right, config);
  const conversionRate = totalPengajuan > 0 ? (approved / totalPengajuan) * 100 : 0;

  return {
    totalPengajuan,
    approved,
    conversionRate,
    joinedRowCount: joined.rows.length,
    joinConfig: config,
  };
}

export function getJoinSourceColumn() {
  return JOIN_SOURCE;
}
