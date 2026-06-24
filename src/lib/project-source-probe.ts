import type { DatabaseConnectionProfile } from "@/lib/types";
import { connectionToApiPayload } from "@/lib/datasource-storage";

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
  activeDbTable: string | null;
}): boolean {
  return (
    project.sheetUrls.length > 0 ||
    Boolean(project.activeDbConnectionId && project.activeDbTable?.trim())
  );
}

export function projectSourceType(project: {
  sheetUrls: string[];
  activeDbConnectionId: string | null;
  activeDbTable: string | null;
}): SourceType | null {
  if (project.sheetUrls.length > 0) return "sheet";
  if (project.activeDbConnectionId && project.activeDbTable?.trim()) return "database";
  return null;
}
