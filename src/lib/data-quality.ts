import type { ColumnMeta, DataQualityIssue, DataQualityReport } from "./types";

const RULES = {
  HIGH_NULL: { id: "high_null_rate", name: "Tingkat null tinggi" },
  ID_DUPLICATE: { id: "identifier_duplicates", name: "Duplikat identifier" },
  SINGLE_CATEGORY: { id: "single_category", name: "Kategori tunggal" },
  LOW_FILL_DIMENSION: { id: "low_fill_dimension", name: "Dimension tidak lengkap" },
  SPARSE_DATASET: { id: "sparse_dataset", name: "Dataset terlalu sedikit" },
} as const;

export function runDataQualityChecks(
  rows: Record<string, string>[],
  columns: ColumnMeta[]
): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const checkedAt = new Date().toISOString();

  if (rows.length < 5) {
    issues.push({
      id: "sparse",
      ruleId: RULES.SPARSE_DATASET.id,
      severity: "warning",
      title: "Sedikit baris data",
      description: `Hanya ${rows.length} baris — analisis agregat mungkin tidak representatif.`,
    });
  }

  for (const col of columns) {
    if (col.key.startsWith("_")) continue;

    if (col.fillRate < 50 && col.semanticRole === "dimension") {
      issues.push({
        id: `low_fill_${col.key}`,
        ruleId: RULES.LOW_FILL_DIMENSION.id,
        severity: "warning",
        title: `${col.businessLabel ?? col.label}: fill rendah`,
        description: `Hanya ${col.fillRate}% baris terisi — filter/drill mungkin bias.`,
        columnKey: col.key,
      });
    }

    const nullRate = rows.length > 0 ? ((col.nullCount ?? 0) / rows.length) * 100 : 0;
    if (nullRate >= 30 && (col.semanticRole === "measure" || col.type === "number")) {
      issues.push({
        id: `null_${col.key}`,
        ruleId: RULES.HIGH_NULL.id,
        severity: nullRate >= 60 ? "critical" : "warning",
        title: `${col.businessLabel ?? col.label}: banyak nilai kosong`,
        description: `${nullRate.toFixed(0)}% baris tanpa nilai pada kolom numerik.`,
        columnKey: col.key,
      });
    }

    if (col.semanticRole === "identifier" && (col.duplicateCount ?? 0) > 0) {
      issues.push({
        id: `dup_${col.key}`,
        ruleId: RULES.ID_DUPLICATE.id,
        severity: "critical",
        title: `Duplikat pada ${col.label}`,
        description: `${col.duplicateCount} nilai identifier duplikat — join/agregat bisa salah.`,
        columnKey: col.key,
      });
    }

    if (
      col.type === "category" &&
      col.uniqueCount === 1 &&
      rows.length > 10 &&
      col.semanticRole === "dimension"
    ) {
      issues.push({
        id: `single_cat_${col.key}`,
        ruleId: RULES.SINGLE_CATEGORY.id,
        severity: "info",
        title: `${col.label}: satu kategori saja`,
        description: "Distribusi chart tidak bermakna — semua baris sama.",
        columnKey: col.key,
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const penalty = issues.reduce((sum, i) => {
    if (i.severity === "critical") return sum + 15;
    if (i.severity === "warning") return sum + 8;
    return sum + 3;
  }, 0);
  const score = Math.max(0, 100 - penalty);

  return {
    score,
    issueCount: issues.length,
    criticalCount,
    issues,
    checkedAt,
  };
}

export function qualityScoreLabel(score: number): string {
  if (score >= 85) return "Baik";
  if (score >= 65) return "Cukup";
  return "Perlu perhatian";
}
