"use client";

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import type { AuditEvent } from "@/lib/audit-log";

export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void fetch("/api/audit?limit=40")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setEvents(json.events ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-900">Audit Log</span>
        </div>
        <button type="button" onClick={load} className="btn-ghost py-1 text-[11px]">
          <RefreshCw className={cnIcon(loading)} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="px-4 py-3 text-xs text-red-600">{error}</p>
      )}

      <div className="max-h-64 overflow-y-auto">
        {events.length === 0 && !loading && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">Belum ada event</p>
        )}
        {events.map((ev) => (
          <div
            key={ev.id}
            className="border-b border-slate-50 px-4 py-2.5 text-[11px] last:border-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {ev.type}
              </span>
              <span className="text-slate-400">
                {new Date(ev.timestamp).toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-1 text-slate-700">{ev.message}</p>
            {ev.role && (
              <p className="mt-0.5 text-slate-400">role: {ev.role}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function cnIcon(loading: boolean) {
  return `h-3 w-3 ${loading ? "animate-spin" : ""}`;
}
