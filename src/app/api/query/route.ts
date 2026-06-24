import { NextRequest, NextResponse } from "next/server";
import { executeReadOnlySql } from "@/lib/sql-engine";
import { resolvePostgresConfig, executePostgresReadOnly } from "@/lib/connectors/postgres";
import { appendAuditEvent } from "@/lib/audit-log";
import { rolePermissions } from "@/lib/auth";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

const MAX_ROWS = 100;
const TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    if (!rolePermissions(user.role).canQuerySQL) {
      return NextResponse.json(
        { error: "SQL read-only memerlukan role Analyst atau Admin" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sql, source = "mock" } = body ?? {};
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "sql wajib diisi" }, { status: 400 });
    }

    const result =
      source === "postgres"
        ? await executePostgresReadOnly(
            await resolvePostgresConfig(body, user.id),
            sql,
            { maxRows: MAX_ROWS, timeoutMs: TIMEOUT_MS }
          )
        : executeReadOnlySql(sql, { maxRows: MAX_ROWS, timeoutMs: TIMEOUT_MS });

    appendAuditEvent("sql_query", sql.slice(0, 200), {
      rowCount: result.rowCount,
      truncated: result.truncated,
      executionMs: result.executionMs,
    }, user.role);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Query gagal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
