export type AuditEventType =
  | "sheet_load"
  | "filter_change"
  | "scope_change"
  | "role_change"
  | "export_csv"
  | "sql_query"
  | "chat_message"
  | "layout_change"
  | "metric_save";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  message: string;
  role?: string;
  meta?: Record<string, string | number | boolean>;
  timestamp: string;
}

const MAX_EVENTS = 500;
const events: AuditEvent[] = [];

export function appendAuditEvent(
  type: AuditEventType,
  message: string,
  meta?: AuditEvent["meta"],
  role?: string
): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    type,
    message,
    role,
    meta,
    timestamp: new Date().toISOString(),
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

export function getAuditEvents(limit = 50): AuditEvent[] {
  return events.slice(0, limit);
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
