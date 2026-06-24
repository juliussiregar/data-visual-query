import type { ColumnMeta } from "./types";

export const MASK_CHAR = "•";
export const MASKED_VALUE = "••••••";

export function maskValue(value: string, sensitive?: boolean): string {
  if (!sensitive || !value?.trim()) return value;
  const trimmed = value.trim();
  if (trimmed.length <= 2) return MASKED_VALUE;
  return `${trimmed[0]}${MASK_CHAR.repeat(Math.min(trimmed.length - 2, 6))}${trimmed.slice(-1)}`;
}

export function maskRow(
  row: Record<string, string>,
  columns: ColumnMeta[],
  maskSensitive: boolean
): Record<string, string> {
  if (!maskSensitive) return row;
  const sensitiveKeys = new Set(columns.filter((c) => c.sensitive).map((c) => c.key));
  if (sensitiveKeys.size === 0) return row;
  const out = { ...row };
  for (const key of sensitiveKeys) {
    if (out[key]) out[key] = maskValue(out[key], true);
  }
  return out;
}

export function maskRows(
  rows: Record<string, string>[],
  columns: ColumnMeta[],
  maskSensitive: boolean
): Record<string, string>[] {
  if (!maskSensitive) return rows;
  return rows.map((r) => maskRow(r, columns, true));
}

export function sanitizeSampleValues(columns: ColumnMeta[]): string {
  return columns
    .map((c) => {
      const samples = c.sensitive
        ? c.sampleValues.map(() => MASKED_VALUE)
        : c.sampleValues;
      return `- ${c.businessLabel ?? c.label} [${c.semanticRole ?? c.type}]${c.sensitive ? " (PII — disamarkan)" : ""}: ${c.type}, ${c.uniqueCount} unik, fill ${c.fillRate}%, contoh: ${samples.join(", ")}`;
    })
    .join("\n");
}
