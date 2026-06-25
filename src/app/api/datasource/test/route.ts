import { NextRequest, NextResponse } from "next/server";
import {
  resolveSqlConfig,
  testSqlConnection,
  databaseTypeLabel,
} from "@/lib/connectors/sql";
import { formatDbConnectionError } from "@/lib/connectors/connection-errors";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let config: Awaited<ReturnType<typeof resolveSqlConfig>> | undefined;
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    config = await resolveSqlConfig(body, user.id);
    const result = await testSqlConnection(config);
    const label = databaseTypeLabel(config.type);
    return NextResponse.json({
      ok: true,
      serverVersion: result.serverVersion,
      database: result.database,
      message: `Terhubung ke ${label} ${result.serverVersion} · database ${result.database}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = formatDbConnectionError(error, config);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
