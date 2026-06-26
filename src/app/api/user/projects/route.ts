import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { createUserProject, listUserProjects, sanitizeProjectDbRefs } from "@/lib/db/projects";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const projects = await listUserProjects(user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat project" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const {
      name,
      description,
      sheetUrls,
      mergeMode,
      dbConnectionIds,
      activeDbConnectionId,
      activeDbTable,
      activeDbTables,
    } = body ?? {};
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nama project wajib" }, { status: 400 });
    }
    const dbRefs = await sanitizeProjectDbRefs(user.id, {
      dbConnectionIds: Array.isArray(dbConnectionIds)
        ? dbConnectionIds.filter((u: unknown): u is string => typeof u === "string")
        : undefined,
      activeDbConnectionId:
        typeof activeDbConnectionId === "string" ? activeDbConnectionId : undefined,
    });

    const tables = Array.isArray(activeDbTables)
      ? activeDbTables.filter((t: unknown): t is string => typeof t === "string")
      : undefined;

    const project = await createUserProject(user.id, name, description, {
      sheetUrls: Array.isArray(sheetUrls) ? sheetUrls : undefined,
      mergeMode: typeof mergeMode === "boolean" ? mergeMode : undefined,
      ...dbRefs,
      activeDbTable: typeof activeDbTable === "string" ? activeDbTable : undefined,
      activeDbTables: tables,
      tableRelations: Array.isArray(body.tableRelations) ? body.tableRelations : undefined,
      derivedFields: Array.isArray(body.derivedFields) ? body.derivedFields : undefined,
    });
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/user/projects]", error);
    const message =
      error instanceof Error ? error.message : "Gagal membuat project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
