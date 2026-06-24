export type ReportScheduleInterval = 0 | 60 | 1440;

const STORAGE_KEY = "sheetvision:reportScheduleMinutes";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadReportScheduleMinutes(): ReportScheduleInterval {
  if (!isBrowser()) return 0;
  try {
    const n = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    if (n === 60 || n === 1440) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveReportScheduleMinutes(minutes: ReportScheduleInterval) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, String(minutes));
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
