import type { AiQueryDataset } from "./types";

export function parseAiQueryDataset(raw: unknown): AiQueryDataset | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.columns) || !Array.isArray(d.rows)) return null;

  const columns = d.columns.filter(
    (c): c is AiQueryDataset["columns"][number] =>
      !!c && typeof c === "object" && typeof (c as { key?: string }).key === "string"
  );
  const rows = d.rows.filter(
    (r): r is Record<string, string> => !!r && typeof r === "object" && !Array.isArray(r)
  );

  if (columns.length === 0) return null;

  return {
    columns,
    rows,
    totalRowCount:
      typeof d.totalRowCount === "number" && Number.isFinite(d.totalRowCount)
        ? d.totalRowCount
        : rows.length,
    sourceUrl: typeof d.sourceUrl === "string" ? d.sourceUrl : undefined,
    kpis: Array.isArray(d.kpis) ? (d.kpis as AiQueryDataset["kpis"]) : undefined,
    insights: Array.isArray(d.insights) ? (d.insights as AiQueryDataset["insights"]) : undefined,
    metrics: Array.isArray(d.metrics) ? (d.metrics as AiQueryDataset["metrics"]) : undefined,
    metricValues:
      d.metricValues && typeof d.metricValues === "object"
        ? (d.metricValues as AiQueryDataset["metricValues"])
        : undefined,
  };
}
