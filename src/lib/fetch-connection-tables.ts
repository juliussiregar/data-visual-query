import type { DbTableOption } from "@/components/DbTableMultiSelect";
import { connectionToApiPayload } from "@/lib/datasource-storage";
import type { DatabaseConnectionProfile } from "@/lib/types";

export interface ConnectionTablesResult {
  tables: DbTableOption[];
  totalCount: number;
  truncated: boolean;
}

export async function fetchConnectionTables(
  profile: DatabaseConnectionProfile,
  search?: string
): Promise<ConnectionTablesResult> {
  const res = await fetch("/api/datasource/tables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...connectionToApiPayload(profile),
      search: search?.trim() || undefined,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Gagal memuat tabel");
  const tables: DbTableOption[] = json.tables ?? [];
  return {
    tables,
    totalCount: json.totalCount ?? tables.length,
    truncated: Boolean(json.truncated),
  };
}
