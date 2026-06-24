import { NextRequest, NextResponse } from "next/server";
import { resolvePostgresConfig, previewPostgresTable } from "@/lib/connectors/postgres";
import { rolePermissions } from "@/lib/auth";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    if (!rolePermissions(user.role).canQuerySQL) {
      return NextResponse.json(
        { error: "Koneksi database memerlukan role Analyst atau Admin" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { table, limit } = body ?? {};
    if (!table || typeof table !== "string") {
      return NextResponse.json({ error: "table wajib diisi" }, { status: 400 });
    }
    const config = await resolvePostgresConfig(body, user.id);
    const preview = await previewPostgresTable(config, table, limit ?? 5);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Preview gagal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
