import type { DatasetSchemaId } from "./types";

/**
 * Semua dataset diperlakukan generik — pola kolom dideteksi otomatis
 * (seperti Grafana: metric & visual mengikuti struktur data, bukan domain tetap).
 */
export function inferSchemaFromKeys(_keys: string[]): DatasetSchemaId {
  return "generic";
}

export function schemaLabel(_schemaId: DatasetSchemaId): string {
  return "Auto-detect";
}

export function schemaSummary(columns: number, dimensions: number, measures: number): string {
  return `${columns} kolom · ${dimensions} dim · ${measures} measure`;
}
