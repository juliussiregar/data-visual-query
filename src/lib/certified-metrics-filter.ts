import type { MetricDefinition } from "./types";
import { METRIC_GLOSSARY } from "./metric-glossary";

export function filterCertifiedMetrics(metrics: MetricDefinition[]): MetricDefinition[] {
  const certifiedIds = new Set(
    METRIC_GLOSSARY.filter((g) => g.status === "certified").map((g) => g.id)
  );
  return metrics.filter(
    (m) => m.status === "certified" || certifiedIds.has(m.id)
  );
}

export function certifiedMetricsNotice(enabled: boolean): string {
  if (!enabled) return "";
  return "\n[GUARDRAIL] Mode certified-only aktif — gunakan hanya metric berstatus certified dalam jawaban.\n";
}
