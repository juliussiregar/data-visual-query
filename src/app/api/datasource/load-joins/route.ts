import { NextRequest, NextResponse } from "next/server";
import { analyzeSheetData } from "@/lib/analyzer";
import {
  resolveSqlConfig,
  executeSqlQuery,
  sqlSourceLabel,
  databaseTypeLabel,
  datasetSourceType,
} from "@/lib/connectors/sql";
import { appendAuditEvent } from "@/lib/audit-log";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { relationToQuerySpec, type TableRelation } from "@/lib/sql-query-types";
import { normalizeTableRelations, isRelationExecutable } from "@/lib/table-relations";
import type { SheetData } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_LOAD_ROWS = 500;

async function loadAnalyzedJoin(
  config: Awaited<ReturnType<typeof resolveSqlConfig>>,
  relation: TableRelation,
  connectionName?: string
): Promise<SheetData> {
  const rows = await executeSqlQuery(config, relationToQuerySpec(relation), MAX_LOAD_ROWS);
  const sourceUrl = `${sqlSourceLabel(config)}#join:${relation.alias}`;
  const data = analyzeSheetData(rows, sourceUrl, undefined, {
    mergeMode: false,
    joinMode: true,
  });

  const dbLabel = databaseTypeLabel(config.type);
  const label = relation.label ?? relation.alias;
  if (data.dataset) {
    data.dataset.sourceType = datasetSourceType(config.type);
    data.dataset.name = `${label} (${dbLabel} join)`;
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const { relations, connectionName } = body ?? {};
    const relationList = normalizeTableRelations(relations).filter(isRelationExecutable);

    if (relationList.length === 0) {
      return NextResponse.json({ error: "relations wajib diisi" }, { status: 400 });
    }

    const config = await resolveSqlConfig(body, user.id);
    const datasets: Record<string, SheetData> = {};
    const sourceUrls: string[] = [];

    for (const relation of relationList) {
      datasets[relation.alias] = await loadAnalyzedJoin(config, relation, connectionName);
      sourceUrls.push(`${sqlSourceLabel(config)}#join:${relation.alias}`);
    }

    await appendAuditEvent(
      "sheet_load",
      `Load DB joins ${relationList.map((r) => r.alias).join(", ")} from ${config.host}`,
      { rowCount: Object.values(datasets).reduce((sum, ds) => sum + ds.rows.length, 0) },
      user.role,
      user.id
    );

    return NextResponse.json({
      datasets,
      relations: relationList.map((r) => r.alias),
      sourceUrls,
      joinMode: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memuat join";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
