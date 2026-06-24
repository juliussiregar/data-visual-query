import { NextRequest, NextResponse } from "next/server";
import { rolePermissions } from "@/lib/auth";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { appendAuditEvent, getAuditEvents } from "@/lib/audit-log";
import type { AuditEventType } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    if (!rolePermissions(user.role).canViewAudit) {
      return NextResponse.json({ error: "Akses audit memerlukan role Admin" }, { status: 403 });
    }
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const events = getAuditEvents(limit);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal memuat audit" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { type, message, meta } = body ?? {};
    if (!type || !message) {
      return NextResponse.json({ error: "type dan message wajib" }, { status: 400 });
    }
    const event = appendAuditEvent(
      type as AuditEventType,
      String(message),
      meta,
      user.role
    );
    return NextResponse.json({ ok: true, id: event.id });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Gagal mencatat audit" }, { status: 500 });
  }
}
