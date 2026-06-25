import { NextRequest, NextResponse } from "next/server";
import { analyzeSheetData } from "@/lib/analyzer";
import {
  resolveSqlConfig,
  loadSqlTable,
  sqlSourceLabel,
  databaseTypeLabel,
  datasetSourceType,
} from "@/lib/connectors/sql";
import { normalizeActiveDbTables } from "@/lib/db-table-datasets";
import { appendAuditEvent } from "@/lib/audit-log";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import type { SheetData } from "@/lib/types";
import type { SqlConnectionConfig } from "@/lib/connectors/sql-types";

export const dynamic = "force-dynamic";

const MAX_LOAD_ROWS = 500;

async function loadAnalyzedTable(
  config: SqlConnectionConfig,
  table: string,
  connectionName?: string
): Promise<SheetData> {
  const rows = await loadSqlTable(config, table, MAX_LOAD_ROWS);
  const sourceUrl = `${sqlSourceLabel(config)}#${table}`;
  const data = analyzeSheetData(rows, sourceUrl, undefined, {
    mergeMode: false,
    joinMode: false,
  });

  const dbLabel = databaseTypeLabel(config.type);
  if (data.dataset) {
    data.dataset.sourceType = datasetSourceType(config.type);
    data.dataset.name = `${String(connectionName ?? table)} (${dbLabel})`;
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const { tables, connectionName } = body ?? {};
    const tableList = normalizeActiveDbTables(
      Array.isArray(tables) ? tables.filter((t: unknown): t is string => typeof t === "string") : []
    );

    if (tableList.length === 0) {
      return NextResponse.json({ error: "tables wajib diisi" }, { status: 400 });
    }

    const config = await resolveSqlConfig(body, user.id);
    const datasets: Record<string, SheetData> = {};

    for (const table of tableList) {
      datasets[table] = await loadAnalyzedTable(config, table, connectionName);
    }

    const primaryTable = tableList[0];
    const primary = datasets[primaryTable];
    const sourceUrls = tableList.map((table) => `${sqlSourceLabel(config)}#${table}`);

    await appendAuditEvent(
      "sheet_load",
      `Load DB tables ${tableList.join(", ")} from ${config.host}`,
      { rowCount: Object.values(datasets).reduce((sum, ds) => sum + ds.rows.length, 0) },
      user.role,
      user.id
    );

    return NextResponse.json({
      ...primary,
      datasets,
      primaryTable,
      tables: tableList,
      sheetUrls: sourceUrls,
      mergeMode: false,
      joinMode: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memuat tabel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
