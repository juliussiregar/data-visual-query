import { NextRequest, NextResponse } from "next/server";
import { resolveSqlConfig, listSqlTables } from "@/lib/connectors/sql";
import { isMysqlFamily } from "@/lib/connectors/sql-types";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const config = await resolveSqlConfig(body, user.id);
    const tables = await listSqlTables(config);
    return NextResponse.json({
      tables,
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
