import { NextRequest, NextResponse } from "next/server";
import {
  resolveSqlConfig,
  previewSqlTable,
  listSqlForeignKeysBetween,
} from "@/lib/connectors/sql";
import { suggestJoinKeys } from "@/lib/join-key-suggest";
import { AuthError, requireSessionUser } from "@/lib/session-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { baseTable, joinTable } = body ?? {};

    if (!baseTable || typeof baseTable !== "string") {
      return NextResponse.json({ error: "baseTable wajib diisi" }, { status: 400 });
    }
    if (!joinTable || typeof joinTable !== "string") {
      return NextResponse.json({ error: "joinTable wajib diisi" }, { status: 400 });
    }
    if (baseTable.trim() === joinTable.trim()) {
      return NextResponse.json({ error: "Tabel dasar dan join harus berbeda" }, { status: 400 });
    }

    const config = await resolveSqlConfig(body, user.id);
    const [basePreview, joinPreview, foreignKeys] = await Promise.all([
      previewSqlTable(config, baseTable.trim(), 1),
      previewSqlTable(config, joinTable.trim(), 1),
      listSqlForeignKeysBetween(config, baseTable.trim(), joinTable.trim()),
    ]);

    const suggestion = suggestJoinKeys(
      baseTable.trim(),
      joinTable.trim(),
      basePreview.columns,
      joinPreview.columns,
      foreignKeys
    );

    return NextResponse.json({
      suggestion,
      foreignKeys,
      baseColumns: basePreview.columns,
      joinColumns: joinPreview.columns,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyarankan kunci join";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
