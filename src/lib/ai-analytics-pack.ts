import type { AiQueryDataset } from "./types";
import { aggregateData } from "./aggregation";
import { parseNumber, formatNumber } from "./format";
import { getDistinctValues } from "./visual-query";

/**
 * Ringkasan analitik lengkap untuk konteks AI.
 * Angka spesifik tetap harus lewat query tools — ini adalah peta data.
 */
export function buildAnalyticsPack(dataset: AiQueryDataset, allowSensitive = false): string {
  const { columns, rows, totalRowCount } = dataset;
  const lines: string[] = [];

  lines.push(`=== ANALYTICS PACK ===`);
  lines.push(`Baris terlihat (scope + filter aktif): ${rows.length.toLocaleString("id-ID")}`);
  lines.push(`Total baris sheet (sebelum filter UI): ${totalRowCount.toLocaleString("id-ID")}`);
  if (dataset.sourceUrl) lines.push(`Sumber: ${dataset.sourceUrl}`);

  if (dataset.derivedFields?.length) {
    lines.push(`\n--- Kolom dihitung (custom project) ---`);
    for (const f of dataset.derivedFields) {
      lines.push(`• ${f.name} (key: ${f.key}) = ${f.formula}`);
    }
    lines.push(
      `Kolom di atas sudah tersimpan di project — bisa dipakai di query tools, run_visual_sql, dan widget.`
    );
  }

  const derivedKeys = new Set((dataset.derivedFields ?? []).map((f) => f.key));

  if (dataset.kpis?.length) {
    lines.push(`\n--- KPI (pre-computed) ---`);
    for (const k of dataset.kpis) {
      lines.push(`• ${k.label}: ${k.value}${k.formula ? ` [${k.formula}]` : ""}`);
    }
  }

  if (dataset.insights?.length) {
    lines.push(`\n--- Insights otomatis ---`);
    for (const i of dataset.insights) {
      lines.push(`• ${i.title}${i.description ? `: ${i.description}` : ""}`);
    }
  }

  if (dataset.metrics?.length) {
    lines.push(`\n--- Metric definitions ---`);
    for (const m of dataset.metrics) {
      lines.push(`• ${m.name} [${m.status}]: ${m.formula}`);
    }
  }

  if (dataset.metricValues) {
    lines.push(`\n--- Metric values ---`);
    lines.push(JSON.stringify(dataset.metricValues, null, 2));
  }

  lines.push(`\n--- Profil kolom ---`);
  for (const col of columns) {
    const label = col.businessLabel ?? col.label;
    const derivedTag = derivedKeys.has(col.key) ? ", derived" : "";
    const samples =
      col.sensitive && !allowSensitive ? ["[PII]"] : col.sampleValues.slice(0, 5);
    lines.push(
      `• ${label} (key: ${col.key}, type: ${col.type}${col.semanticRole ? `, role: ${col.semanticRole}` : ""}${derivedTag}) — ${col.uniqueCount} unik, fill ${col.fillRate}% — contoh: ${samples.join(", ")}`
    );
  }

  lines.push(`\n--- Distribusi kategorikal (semua nilai unik) ---`);
  for (const col of columns) {
    if (col.type !== "category" && col.type !== "text") continue;
    const dist = aggregateData(rows, col.key, undefined, "count");
    if (dist.length === 0) continue;
    const label = col.businessLabel ?? col.label;
    lines.push(
      `${label} (${col.key}): ${dist.map((d) => `${d.name}=${d.value} (${d.percentage?.toFixed(1)}%)`).join(", ")}`
    );
  }

  lines.push(`\n--- Ringkasan numerik ---`);
  for (const col of columns) {
    if (col.type !== "number") continue;
    const nums = rows
      .map((r) => parseNumber(r[col.key]))
      .filter((n): n is number => n !== null);
    if (nums.length === 0) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const label = col.businessLabel ?? col.label;
    lines.push(
      `${label} (${col.key}): count=${nums.length}, sum=${formatNumber(sum)}, avg=${formatNumber(avg, true)}, min=${formatNumber(min)}, max=${formatNumber(max)}`
    );
  }

  lines.push(`\n--- Nilai unik per kolom (maks 40) ---`);
  for (const col of columns.filter((c) => allowSensitive || !c.sensitive)) {
    const vals = getDistinctValues(rows, col.key, 40);
    if (vals.length === 0) continue;
    const label = col.businessLabel ?? col.label;
    lines.push(`${label}: [${vals.join(", ")}]${vals.length >= 40 ? " …" : ""}`);
  }

  lines.push(
    `\n[QUERY ENGINE] Untuk angka spesifik (filter, bandingkan, top-N, dll.) WAJIB panggil tools — jangan hitung manual.`
  );

  return lines.join("\n");
}
