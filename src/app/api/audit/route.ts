import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSessionUser } from "@/lib/session-server";
import { appendAuditEvent, getAuditEvents } from "@/lib/audit-log";
import type { AuditEventType } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
    const events = await getAuditEvents(limit);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser(request);
    const body = await request.json();
    const { type, message, meta } = body ?? {};
    if (!type || !message) {
      return NextResponse.json({ error: "type and message are required" }, { status: 400 });
    }
    const event = await appendAuditEvent(
      type as AuditEventType,
      String(message),
      meta,
      user.role,
      user.id
    );
    return NextResponse.json({ ok: true, id: event.id });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to record audit event" }, { status: 500 });
  }
}
