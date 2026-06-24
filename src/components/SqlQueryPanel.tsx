"use client";

import { useEffect, useState } from "react";
import { Play, Terminal, Database, Server } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { logAuditClient } from "@/lib/audit-log";
import type { UserRole } from "@/lib/auth";
import { rolePermissions } from "@/lib/auth";
import { fetchDbConnections, connectionToApiPayload } from "@/lib/datasource-storage";
import type { DatabaseConnectionProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SqlQueryPanelProps {
  role: UserRole;
}

type QuerySource = "mock" | "postgres";

export function SqlQueryPanel({ role }: SqlQueryPanelProps) {
  const perms = rolePermissions(role);
  const [sql, setSql] = useState("SELECT * FROM portofolio_kredit LIMIT 10");
  const [source, setSource] = useState<QuerySource>("mock");
  const [connections, setConnections] = useState<DatabaseConnectionProfile[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    columns: string[];
    rows: Record<string, string>[];
    rowCount: number;
    truncated: boolean;
    executionMs: number;
  } | null>(null);

  useEffect(() => {
    void fetchDbConnections().then((list) => {
      setConnections(list);
      if (list[0]) setConnectionId(list[0].id);
    });
  }, []);

  const activeConnection = connections.find((c) => c.id === connectionId);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { sql, source };
      if (source === "postgres") {
        if (!activeConnection) throw new Error("Pilih koneksi PostgreSQL");
        Object.assign(body, connectionToApiPayload(activeConnection));
      }

      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Query gagal");
      setResult(json);
      logAuditClient(
        "sql_query",
        `${source}:${sql.slice(0, 100)}`,
        { rowCount: json.rowCount },
        role
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query gagal");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (!perms.canQuerySQL) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="SQL Read-Only"
          description="Analyst/Admin · timeout 5s · max 100 baris · hanya SELECT"
        />
        <div className="surface-card border-amber-200 bg-amber-50/50 p-5 text-xs text-amber-800">
          Role <strong>Viewer</strong> tidak dapat menjalankan SQL.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SQL Read-Only"
        description="Analyst/Admin · timeout 5 detik · maks 100 baris · hanya perintah SELECT"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSource("mock")}
          className={cn(
            "surface-card flex items-start gap-3 p-4 text-left transition-colors",
            source === "mock" && "border-violet-300 ring-2 ring-violet-500/20"
          )}
        >
          <Server className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
          <div>
            <p className="text-xs font-semibold text-slate-900">Mock Database</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              portofolio_kredit, pengajuan_kredit — tanpa kredensial
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSource("postgres")}
          disabled={connections.length === 0}
          className={cn(
            "surface-card flex items-start gap-3 p-4 text-left transition-colors disabled:opacity-50",
            source === "postgres" && "border-violet-300 ring-2 ring-violet-500/20"
          )}
        >
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <div>
            <p className="text-xs font-semibold text-slate-900">PostgreSQL</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {connections.length > 0
                ? `${connections.length} koneksi tersimpan`
                : "Tambah koneksi di tab Sumber Data dulu"}
            </p>
          </div>
        </button>
      </div>

      {source === "postgres" && connections.length > 0 && (
        <div className="surface-card p-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Koneksi</span>
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.host}/{c.database}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
          <Terminal className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Query editor</span>
          <span className="ml-auto rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-600">
            {source === "mock" ? "Mock DB" : "PostgreSQL"}
          </span>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={5}
          className="w-full resize-y border-0 bg-white px-4 py-3 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500/20"
          spellCheck={false}
          placeholder="SELECT kolom1, kolom2 FROM nama_tabel WHERE ... LIMIT 10"
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
          <p className="text-[10px] text-slate-400">
            Hanya SELECT · kata kunci INSERT/UPDATE/DELETE diblokir
          </p>
          <button
            type="button"
            onClick={() => void runQuery()}
            disabled={loading || (source === "postgres" && !connectionId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            {loading ? "Menjalankan…" : "Jalankan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-[11px] text-slate-500">
            <span>
              {result.rowCount} baris · {result.executionMs}ms
            </span>
            {result.truncated && <span className="text-amber-600">Hasil dipotong (limit)</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-2 font-medium text-slate-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    {result.columns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-700">
                        {row[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
