"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Search, Shield } from "lucide-react";
import type { AuditEvent, AuditEventType } from "@/lib/audit-log";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<AuditEventType, string> = {
  sheet_load: "Sheet load",
  filter_change: "Filter",
  scope_change: "Scope",
  role_change: "Role",
  export_csv: "Export",
  chat_message: "Chat",
  layout_change: "Layout",
  metric_save: "Metric",
};

const TYPE_STYLES: Record<AuditEventType, string> = {
  sheet_load: "bg-blue-50 text-blue-700 ring-blue-200",
  filter_change: "bg-violet-50 text-violet-700 ring-violet-200",
  scope_change: "bg-amber-50 text-amber-800 ring-amber-200",
  role_change: "bg-rose-50 text-rose-700 ring-rose-200",
  export_csv: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  chat_message: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  layout_change: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  metric_save: "bg-slate-100 text-slate-700 ring-slate-200",
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as AuditEventType[];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMeta(meta?: AuditEvent["meta"]): string | null {
  if (!meta || Object.keys(meta).length === 0) return null;
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AuditEventType | "all">("all");

  const load = () => {
    setLoading(true);
    void fetch("/api/audit?limit=100")
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

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        ev.message.toLowerCase().includes(q) ||
        ev.type.toLowerCase().includes(q) ||
        (ev.role?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [events, search, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<AuditEventType, number>> = {};
    for (const ev of events) {
      counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
          </div>
          <p className="text-sm text-slate-500">
            Riwayat aktivitas penting di workspace Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-slate-900">{events.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Total events
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-slate-900">{filtered.length}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Shown
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            By type
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.filter((t) => (typeCounts[t] ?? 0) > 0).map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                  TYPE_STYLES[t]
                )}
              >
                {TYPE_LABELS[t]} {typeCounts[t]}
              </span>
            ))}
            {events.length === 0 && (
              <span className="text-xs text-slate-400">No events yet</span>
            )}
          </div>
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message or role…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AuditEventType | "all")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            <option value="all">All types</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">No events found</p>
            <p className="mt-1 text-xs text-slate-400">
              {events.length === 0
                ? "Activity will appear here as you use the dashboard."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Time
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Message
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => {
                  const meta = formatMeta(ev.meta);
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-slate-500">
                        {formatTime(ev.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                            TYPE_STYLES[ev.type]
                          )}
                        >
                          {TYPE_LABELS[ev.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-800">{ev.message}</p>
                        {meta && (
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400">{meta}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {ev.role ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
