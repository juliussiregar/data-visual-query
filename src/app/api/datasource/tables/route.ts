import { NextRequest, NextResponse } from "next/server";
import { resolvePostgresConfig, listPostgresTables } from "@/lib/connectors/postgres";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);

    const body = await request.json();
    const config = await resolvePostgresConfig(body, user.id);
    const tables = await listPostgresTables(config);
    return NextResponse.json({ tables, schema: config.schema ?? "public" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal memuat tabel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
