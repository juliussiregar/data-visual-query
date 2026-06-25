import { NextRequest, NextResponse } from "next/server";
import { analyzeSheetData } from "@/lib/analyzer";
import {
  resolveSqlConfig,
  loadSqlTable,
  sqlSourceLabel,
  databaseTypeLabel,
  datasetSourceType,
} from "@/lib/connectors/sql";
import { appendAuditEvent } from "@/lib/audit-log";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

const MAX_LOAD_ROWS = 500;

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const { table, connectionName } = body ?? {};
    if (!table || typeof table !== "string") {
      return NextResponse.json({ error: "table wajib diisi" }, { status: 400 });
    }

    const config = await resolveSqlConfig(body, user.id);
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

    await appendAuditEvent(
      "sheet_load",
      `Load DB table ${table} from ${config.host}`,
      { rowCount: rows.length },
      user.role,
      user.id
    );

    return NextResponse.json({
      ...data,
      sheetUrls: [sourceUrl],
      mergeMode: false,
      joinMode: false,
      dbSource: { table, connectionName },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memuat tabel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
