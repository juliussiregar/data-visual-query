import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { createUserProject, listUserProjects } from "@/lib/db/projects";

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
    } = body ?? {};
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nama project wajib" }, { status: 400 });
    }
    const project = await createUserProject(user.id, name, description, {
      sheetUrls: Array.isArray(sheetUrls) ? sheetUrls : undefined,
      mergeMode: typeof mergeMode === "boolean" ? mergeMode : undefined,
      dbConnectionIds: Array.isArray(dbConnectionIds) ? dbConnectionIds : undefined,
      activeDbConnectionId:
        typeof activeDbConnectionId === "string" ? activeDbConnectionId : undefined,
      activeDbTable: typeof activeDbTable === "string" ? activeDbTable : undefined,
    });
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal membuat project" }, { status: 500 });
  }
}
