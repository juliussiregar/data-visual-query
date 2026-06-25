import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import {
  deleteUserProject,
  getUserProject,
  sanitizeProjectDbRefs,
  updateUserProject,
  type ProjectUpsertInput,
} from "@/lib/db/projects";
import type { DashboardLayout } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSessionUser(request);
    const { id } = await context.params;
    const project = await getUserProject(user.id, id);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSessionUser(request);
    const { id } = await context.params;
    const body = await request.json();

    const input: ProjectUpsertInput = {};

    if (typeof body.name === "string") input.name = body.name;
    if (body.description === null || typeof body.description === "string") {
      input.description = body.description;
    }
    if (Array.isArray(body.sheetUrls)) {
      input.sheetUrls = body.sheetUrls.filter(
        (u: unknown): u is string => typeof u === "string" && u.trim() !== ""
      );
    }
    if (typeof body.mergeMode === "boolean") input.mergeMode = body.mergeMode;
    if (Array.isArray(body.dbConnectionIds)) {
      input.dbConnectionIds = body.dbConnectionIds.filter(
        (u: unknown): u is string => typeof u === "string"
      );
    }
    if (body.activeDbConnectionId === null || typeof body.activeDbConnectionId === "string") {
      input.activeDbConnectionId = body.activeDbConnectionId;
    }
    if (body.activeDbTable === null || typeof body.activeDbTable === "string") {
      input.activeDbTable = body.activeDbTable;
    }
    if (Array.isArray(body.activeDbTables)) {
      input.activeDbTables = body.activeDbTables.filter(
        (t: unknown): t is string => typeof t === "string" && t.trim() !== ""
      );
    }
    if (Array.isArray(body.tableRelations)) {
      input.tableRelations = body.tableRelations;
    }
    if (body.layout === null) {
      input.layout = null;
    } else if (body.layout && (body.layout as DashboardLayout).version === 1) {
      input.layout = body.layout as DashboardLayout;
    }
    if (body.touchOpened) input.touchOpened = true;

    const dbRefs = await sanitizeProjectDbRefs(user.id, {
      dbConnectionIds: input.dbConnectionIds,
      activeDbConnectionId: input.activeDbConnectionId,
    });
    Object.assign(input, dbRefs);

    const project = await updateUserProject(user.id, id, input);
    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[PATCH /api/user/projects]", error);
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSessionUser(request);
    const { id } = await context.params;
    const ok = await deleteUserProject(user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal menghapus project" }, { status: 500 });
  }
}
