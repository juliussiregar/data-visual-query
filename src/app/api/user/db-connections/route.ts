import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import {
  deleteUserDbConnection,
  listUserDbConnections,
  upsertUserDbConnection,
} from "@/lib/db/user-connections";
import { databaseTypeLabel, normalizeDatabaseType } from "@/lib/connectors/sql-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const connections = await listUserDbConnections(user.id);
    return NextResponse.json({ connections });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat koneksi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const {
      id,
      type,
      name,
      host,
      port,
      database,
      username,
      password,
      ssl,
      schema,
      lastTestedAt,
      lastTestStatus,
      lastTestMessage,
    } = body ?? {};

    if (!host || !database || !username) {
      return NextResponse.json(
        { error: "Host, database, dan username wajib diisi" },
        { status: 400 }
      );
    }

    const isUpdate = typeof id === "string" && id.trim() !== "";
    if (!isUpdate && !password) {
      return NextResponse.json(
        { error: "Password wajib diisi untuk koneksi baru" },
        { status: 400 }
      );
    }

    const dbType = normalizeDatabaseType(type);
    const connection = await upsertUserDbConnection(user.id, {
      id: isUpdate ? id : undefined,
      type: dbType,
      name: String(name ?? `${databaseTypeLabel(dbType)} ${host}`),
      host: String(host),
      port: parseInt(String(port ?? "5432"), 10) || 5432,
      database: String(database),
      username: String(username),
      password: typeof password === "string" ? password : undefined,
      ssl: Boolean(ssl),
      schema: String(schema ?? "public"),
      lastTestedAt: typeof lastTestedAt === "string" ? lastTestedAt : undefined,
      lastTestStatus:
        lastTestStatus === "success" || lastTestStatus === "failed"
          ? lastTestStatus
          : undefined,
      lastTestMessage: typeof lastTestMessage === "string" ? lastTestMessage : undefined,
    });

    return NextResponse.json({ connection });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Gagal menyimpan koneksi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Parameter id wajib" }, { status: 400 });
    }
    await deleteUserDbConnection(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal menghapus koneksi" }, { status: 500 });
  }
}
