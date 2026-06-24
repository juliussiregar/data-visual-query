import { NextRequest, NextResponse } from "next/server";
import { resolvePostgresConfig, testPostgresConnection } from "@/lib/connectors/postgres";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const config = await resolvePostgresConfig(body, user.id);
    const result = await testPostgresConnection(config);
    return NextResponse.json({
      ok: true,
      serverVersion: result.serverVersion,
      database: result.database,
      message: `Terhubung ke PostgreSQL ${result.serverVersion} · database ${result.database}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Koneksi gagal";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
