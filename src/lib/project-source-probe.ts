import { analyzeSheetData } from "@/lib/analyzer";
import type { DatabaseConnectionProfile, ColumnMeta } from "@/lib/types";
import { connectionToApiPayload } from "@/lib/datasource-storage";
import { resolveProjectDbTables } from "@/lib/db-table-datasets";
import type { Project } from "@/lib/project-types";
import { formatDbTableLabel } from "@/lib/db-table-datasets";

export type SourceType = "sheet" | "database";

export interface SheetProbeOk {
  ok: true;
  type: "sheet";
  label: string;
  rowCount: number;
  columnCount: number;
  message: string;
}

export interface DbProbeOk {
  ok: true;
  type: "database";
  message: string;
  table: string;
  previewRows: number;
}

export interface ProbeError {
  ok: false;
  error: string;
}

export type ProbeResult = SheetProbeOk | DbProbeOk | ProbeError;

export async function probeSheetUrl(url: string): Promise<ProbeResult> {
  try {
    const res = await fetch("/api/sheet/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Gagal mengakses Google Sheet" };
    }
    return {
      ok: true,
      type: "sheet",
      label: json.label ?? "Google Sheet",
      rowCount: json.rowCount ?? 0,
      columnCount: json.columnCount ?? 0,
      message: json.message ?? "Sheet dapat dibuka",
    };
  } catch {
    return { ok: false, error: "Gagal menghubungi server" };
  }
}

export async function probeDatabaseTable(
  connection: DatabaseConnectionProfile,
  table: string
): Promise<ProbeResult> {
  const trimmedTable = table.trim();
  if (!trimmedTable) {
    return { ok: false, error: "Nama tabel wajib diisi" };
  }

  try {
    const testRes = await fetch("/api/datasource/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(connectionToApiPayload(connection)),
    });
    const testJson = await testRes.json();
    if (!testRes.ok) {
      return { ok: false, error: testJson.error ?? "Koneksi database gagal" };
    }

    const previewRes = await fetch("/api/datasource/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(connectionToApiPayload(connection, { table: trimmedTable, limit: 3 })),
    });
    const previewJson = await previewRes.json();
    if (!previewRes.ok) {
      return {
        ok: false,
        error: previewJson.error ?? `Tabel "${trimmedTable}" tidak ditemukan atau tidak dapat diakses`,
      };
    }

    const previewRows = Array.isArray(previewJson.rows) ? previewJson.rows.length : 0;
    return {
      ok: true,
      type: "database",
      table: trimmedTable,
      previewRows,
      message: `${testJson.message ?? "Database terhubung"} · tabel ${trimmedTable} (${previewRows} baris contoh)`,
    };
  } catch {
    return { ok: false, error: "Gagal menghubungi server" };
  }
}

export function projectHasSource(project: {
  sheetUrls: string[];
  activeDbConnectionId: string | null;
  activeDbTable?: string | null;
  activeDbTables?: string[];
}): boolean {
  return (
    project.sheetUrls.length > 0 ||
    Boolean(project.activeDbConnectionId && resolveProjectDbTables(project).length > 0)
  );
}

export function projectSourceType(project: {
  sheetUrls: string[];
  activeDbConnectionId: string | null;
  activeDbTable?: string | null;
  activeDbTables?: string[];
}): SourceType | null {
  if (project.sheetUrls.length > 0) return "sheet";
  if (project.activeDbConnectionId && resolveProjectDbTables(project).length > 0) return "database";
  return null;
}

function columnsFromSampleRows(rows: Record<string, string>[]): ColumnMeta[] {
  if (!rows.length) return [];
  return analyzeSheetData(rows, "", new Date().toISOString()).columns;
}

/** Kolom numerik untuk saran rumus — dari sumber data project yang sedang diedit (bukan dashboard aktif). */
export async function fetchSourceColumnsForDerivedFields(
  sourceType: SourceType,
  sheetUrl: string,
  connection: DatabaseConnectionProfile | null,
  tables: string[]
): Promise<ColumnMeta[]> {
  try {
    if (sourceType === "sheet") {
      const url = sheetUrl.trim();
      if (!url) return [];
      const res = await fetch("/api/sheet/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sampleRows: 30 }),
      });
      const json = await res.json();
      if (!res.ok) return [];
      const sampleRows = Array.isArray(json.sampleRows) ? json.sampleRows : [];
      return columnsFromSampleRows(sampleRows);
    }

    if (!connection || tables.length === 0) return [];
    const res = await fetch("/api/datasource/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        connectionToApiPayload(connection, { table: tables[0], limit: 30 })
      ),
    });
    const json = await res.json();
    if (!res.ok) return [];
    const rows = Array.isArray(json.rows) ? json.rows : [];
    return columnsFromSampleRows(rows);
  } catch {
    return [];
  }
}

/** Ringkasan sumber data yang sudah tersimpan di project. */
export function describeProjectSavedSource(
  project: Project,
  connections: DatabaseConnectionProfile[]
): string {
  const type = projectSourceType(project);
  if (type === "sheet") {
    const url = project.sheetUrls[0] ?? "";
    return url ? `Google Sheet · ${url.slice(0, 48)}${url.length > 48 ? "…" : ""}` : "Google Sheet (belum diisi)";
  }
  if (type === "database") {
    const conn = connections.find((c) => c.id === project.activeDbConnectionId);
    const tables = resolveProjectDbTables(project);
    const tablePart = tables.length
      ? tables.map((t) => formatDbTableLabel(t)).join(", ")
      : "belum pilih tabel";
    const connPart = conn
      ? `${conn.name} (${conn.type}) · schema ${conn.schema || "public"}`
      : "Database";
    return `${connPart} · ${tablePart}`;
  }
  return "Belum dikonfigurasi";
}
