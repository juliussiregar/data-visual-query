import type { SheetData } from "./types";
import { maskRows, sanitizeSampleValues } from "./pii-mask";

export interface GuardrailMeta {
  assumptions: string[];
  sources: string[];
  confidence: "high" | "medium" | "low" | "insufficient";
}

export interface ChatSummaryOptions {
  maskPII?: boolean;
}

export function buildDataSummaryForChat(
  data: SheetData,
  options: ChatSummaryOptions = {}
): string {
  const { maskPII = true } = options;
  const columnSummary = sanitizeSampleValues(data.columns);

  const sampleRows = maskPII
    ? maskRows(data.rows.slice(0, 15), data.columns, true)
    : data.rows.slice(0, 15);
  const sampleJson = JSON.stringify(sampleRows, null, 2);

  const ds = data.dataset;
  const datasetBlock = ds
    ? `Dataset: ${ds.name}\nSumber: ${ds.sourceType}\nLineage: ${ds.lineageSummary ?? "—"}\nFreshness: ${ds.freshness.label}\nKualitas data: skor ${ds.quality?.score ?? "—"}/100\nProfil: ${ds.profile.rowCount} baris, ${ds.profile.dimensionCount} dimension, ${ds.profile.measureCount} measure\n`
    : "";

  const metricsBlock =
    data.metrics && data.metrics.length > 0
      ? `Metrics:\n${data.metrics.map((m) => `- ${m.name} [${m.status}]: ${m.formula}`).join("\n")}\n`
      : "";

  const valuesBlock = data.metricValues
    ? `Nilai Metric Saat Ini: ${JSON.stringify(data.metricValues)}\n`
    : "";

  const piiNote = maskPII
    ? "\n[GUARDRAIL] Sample data & PII disamarkan sebelum dikirim ke model.\n"
    : "";

  const lineageNote = data.columns.some((c) => c.lineage)
    ? `Lineage kolom (contoh): ${data.columns
        .slice(0, 8)
        .map((c) => `${c.key}←${c.lineage?.sourceLabel ?? "?"}`)
        .join(", ")}\n`
    : "";

  return `${datasetBlock}${metricsBlock}${valuesBlock}${piiNote}${lineageNote}Kolom:\n${columnSummary}\n\nJumlah baris: ${data.rows.length}\nKPI: ${data.kpis.map((k) => `${k.label}: ${k.value}${k.formula ? ` [${k.formula}]` : ""}`).join(", ")}\nInsights: ${data.insights.map((i) => i.title).join("; ")}\n\nSample data (15 baris pertama):\n${sampleJson}`;
}

export function parseGuardrailResponse(raw: {
  reply?: string;
  actions?: unknown[];
  assumptions?: string[];
  sources?: string[];
  confidence?: string;
}): GuardrailMeta {
  const confidence =
    raw.confidence === "high" ||
    raw.confidence === "medium" ||
    raw.confidence === "low" ||
    raw.confidence === "insufficient"
      ? raw.confidence
      : "medium";

  return {
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.filter(Boolean) : [],
    sources: Array.isArray(raw.sources) ? raw.sources.filter(Boolean) : [],
    confidence,
  };
}

export function formatGuardrailFootnote(meta: GuardrailMeta): string | null {
  if (meta.assumptions.length === 0 && meta.sources.length === 0) return null;
  const parts: string[] = [];
  if (meta.sources.length) parts.push(`Sumber: ${meta.sources.join(", ")}`);
  if (meta.assumptions.length) parts.push(`Asumsi: ${meta.assumptions.join("; ")}`);
  if (meta.confidence === "insufficient" || meta.confidence === "low") {
    parts.push("Tingkat keyakinan rendah — verifikasi manual disarankan.");
  }
  return parts.join(" · ");
}
