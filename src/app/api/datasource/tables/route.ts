import { NextRequest, NextResponse } from "next/server";
import { countSqlTables, listSqlTables, resolveSqlConfig } from "@/lib/connectors/sql";
import { isMysqlFamily } from "@/lib/connectors/sql-types";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const search = typeof body.search === "string" ? body.search.trim() : undefined;
    const config = await resolveSqlConfig(body, user.id);
    const [tables, totalCount] = await Promise.all([
      listSqlTables(config, search ? { search } : undefined),
      search ? Promise.resolve(0) : countSqlTables(config),
    ]);
    const resolvedTotal = search ? tables.length : totalCount;
    return NextResponse.json({
      tables,
      totalCount: resolvedTotal,
      truncated: !search && resolvedTotal > tables.length,
      search: search || undefined,
      schema: config.schema ?? (isMysqlFamily(config.type) ? config.database : "public"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memuat tabel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
