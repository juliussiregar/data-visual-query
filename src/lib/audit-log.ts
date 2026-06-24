import type { Prisma } from "@prisma/client";
import { getPrisma, isAppDatabaseConfigured } from "./db/prisma";

export type AuditEventType =
  | "sheet_load"
  | "filter_change"
  | "scope_change"
  | "role_change"
  | "export_csv"
  | "chat_message"
  | "layout_change"
  | "metric_save";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  message: string;
  role?: string;
  userId?: string;
  meta?: Record<string, string | number | boolean>;
  timestamp: string;
}

const MAX_MEMORY_EVENTS = 500;
const memoryEvents: AuditEvent[] = [];

function rowToEvent(row: {
  id: string;
  type: string;
  message: string;
  role: string | null;
  userId: string | null;
  metaJson: Prisma.JsonValue;
  createdAt: Date;
}): AuditEvent {
  return {
    id: row.id,
    type: row.type as AuditEventType,
    message: row.message,
    role: row.role ?? undefined,
    userId: row.userId ?? undefined,
    meta:
      row.metaJson && typeof row.metaJson === "object" && !Array.isArray(row.metaJson)
        ? (row.metaJson as Record<string, string | number | boolean>)
        : undefined,
    timestamp: row.createdAt.toISOString(),
  };
}

function pushMemory(event: AuditEvent) {
  memoryEvents.unshift(event);
  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.length = MAX_MEMORY_EVENTS;
  }
}

export async function appendAuditEvent(
  type: AuditEventType,
  message: string,
  meta?: AuditEvent["meta"],
  role?: string,
  userId?: string
): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    type,
    message,
    role,
    userId,
    meta,
    timestamp: new Date().toISOString(),
  };

  if (isAppDatabaseConfigured()) {
    try {
      const created = await getPrisma().auditEvent.create({
        data: {
          id: event.id,
          userId: userId ?? null,
          type,
          message,
          role: role ?? null,
          metaJson: meta ?? undefined,
        },
      });
      return rowToEvent(created);
    } catch (err) {
      console.error("[audit] persist failed, using memory fallback", err);
    }
  }

  pushMemory(event);
  return event;
}

export async function getAuditEvents(limit = 50): Promise<AuditEvent[]> {
  if (isAppDatabaseConfigured()) {
    try {
      const rows = await getPrisma().auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 200),
      });
      return rows.map(rowToEvent);
    } catch (err) {
      console.error("[audit] load failed, using memory fallback", err);
    }
  }

  return memoryEvents.slice(0, limit);
}

export function logAuditClient(
  type: AuditEventType,
  message: string,
  meta?: AuditEvent["meta"],
  role?: string
) {
  if (typeof window === "undefined") return;
  void fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, message, meta, role }),
  }).catch(() => {
    /* best-effort */
  });
}
