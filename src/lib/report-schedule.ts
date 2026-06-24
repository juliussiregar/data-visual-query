import { userScopedKey } from "./user-local-storage";

export type ReportScheduleInterval = 0 | 60 | 1440;

function storageKey(userId: string) {
  return userScopedKey(userId, "reportScheduleMinutes");
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadReportScheduleMinutes(userId: string): ReportScheduleInterval {
  if (!isBrowser() || !userId) return 0;
  try {
    const n = parseInt(localStorage.getItem(storageKey(userId)) ?? "0", 10);
    if (n === 60 || n === 1440) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveReportScheduleMinutes(userId: string, minutes: ReportScheduleInterval) {
  if (!isBrowser() || !userId) return;
  localStorage.setItem(storageKey(userId), String(minutes));
}

export function buildCsvFromRows(
  rows: Record<string, string>[],
  columnKeys: string[]
): string {
  const headers = columnKeys;
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ];
  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
