"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Plus,
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  Table2,
  LayoutDashboard,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Server,
} from "lucide-react";
import type { DatabaseConnectionProfile, SheetData } from "@/lib/types";
import {
  fetchDbConnections,
  saveDbConnection,
  removeDbConnection,
  connectionToApiPayload,
  draftConnectionPayload,
} from "@/lib/datasource-storage";
import { cn } from "@/lib/utils";

interface DatabaseConnectionsPanelProps {
  onLoadToDashboard?: (data: SheetData) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
}

const EMPTY_FORM = {
  name: "",
  host: "localhost",
  port: "5432",
  database: "",
  username: "",
  password: "",
  ssl: false,
  schema: "public",
  rememberPassword: true,
};

export function DatabaseConnectionsPanel({
  onLoadToDashboard,
  onLoadingChange,
}: DatabaseConnectionsPanelProps) {
  const [connections, setConnections] = useState<DatabaseConnectionProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [preview, setPreview] = useState<{
    columns: string[];
    rows: Record<string, string>[];
  } | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshConnections = useCallback(async () => {
    setConnections(await fetchDbConnections());
  }, []);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  const buildDraftProfile = useCallback((): DatabaseConnectionProfile => {
    return {
      id: crypto.randomUUID(),
      name: form.name.trim() || `PostgreSQL ${form.host}`,
      type: "postgresql",
      host: form.host.trim(),
      port: parseInt(form.port, 10) || 5432,
      database: form.database.trim(),
      username: form.username.trim(),
      password: form.password,
      rememberPassword: true,
      ssl: form.ssl,
      schema: form.schema.trim() || "public",
      createdAt: new Date().toISOString(),
    };
  }, [form]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTables([]);
    setPreview(null);
    try {
      const draft = buildDraftProfile();
      const res = await fetch("/api/datasource/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftConnectionPayload({ ...draft, password: form.password })),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Koneksi gagal");
      setTestResult({ ok: true, message: json.message });
      const saved = await saveDbConnection(
        {
          ...draft,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: "success",
          lastTestMessage: json.message,
        },
        form.password
      );
      if (saved) {
        setConnections((prev) => {
          const next = prev.filter((c) => c.id !== saved.id);
          return [saved, ...next];
        });
        await fetchTables(saved);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Koneksi gagal";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const fetchTables = async (profile: DatabaseConnectionProfile) => {
    setLoadingTables(true);
    try {
      const res = await fetch("/api/datasource/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionToApiPayload(profile)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTables(json.tables ?? []);
      if (json.tables?.[0]) setSelectedTable(json.tables[0].name);
    } catch {
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const handlePreview = async (profile: DatabaseConnectionProfile) => {
    if (!selectedTable) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/datasource/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connectionToApiPayload(profile),
          table: selectedTable,
          limit: 5,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPreview(json);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleLoadDashboard = async (profile: DatabaseConnectionProfile) => {
    if (!selectedTable || !onLoadToDashboard) return;
    setLoadingDashboard(true);
    onLoadingChange?.(true);
    try {
      const res = await fetch("/api/datasource/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...connectionToApiPayload(profile),
          table: selectedTable,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      onLoadToDashboard(json as SheetData);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memuat ke dashboard");
    } finally {
      setLoadingDashboard(false);
      onLoadingChange?.(false);
    }
  };

  const handleDelete = async (id: string) => {
    await removeDbConnection(id);
    await refreshConnections();
    if (expandedId === id) setExpandedId(null);
  };

  const openExisting = (profile: DatabaseConnectionProfile) => {
    setExpandedId(profile.id);
    setTables([]);
    setPreview(null);
    void fetchTables(profile);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Database className="h-4 w-4 text-indigo-600" />
            Koneksi Database
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            Hubungkan PostgreSQL read-only. Kredensial disimpan terenkripsi di database akun Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setForm(EMPTY_FORM);
            setTestResult(null);
            setTables([]);
            setPreview(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Koneksi Baru
        </button>
      </div>

      {/* Info strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Server,
            title: "PostgreSQL",
            desc: "Read replica, staging, atau lokal",
          },
          {
            icon: Shield,
            title: "Read-only",
            desc: "Hanya SELECT · timeout 5 detik",
          },
          {
            icon: LayoutDashboard,
            title: "Muat ke dashboard",
            desc: "Satu tabel → KPI & grafik otomatis",
          },
        ].map((item) => (
          <div key={item.title} className="surface-card flex gap-3 p-3">
            <item.icon className="h-4 w-4 shrink-0 text-indigo-500" />
            <div>
              <p className="text-xs font-semibold text-slate-800">{item.title}</p>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="surface-card overflow-hidden border-indigo-200/60">
          <div className="border-b border-slate-100 bg-indigo-50/50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">Konfigurasi PostgreSQL</p>
            <p className="text-[11px] text-slate-500">
              Isi detail koneksi lalu klik <strong>Tes koneksi</strong> sebelum menyimpan.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field
              label="Nama koneksi"
              hint="Label untuk mengenali sumber ini"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Staging Portofolio"
            />
            <Field
              label="Host"
              hint="Alamat server database"
              value={form.host}
              onChange={(v) => setForm((f) => ({ ...f, host: v }))}
              placeholder="db.staging.bank.internal"
            />
            <Field
              label="Port"
              hint="Default PostgreSQL: 5432"
              value={form.port}
              onChange={(v) => setForm((f) => ({ ...f, port: v }))}
              placeholder="5432"
            />
            <Field
              label="Nama database"
              hint="Database yang berisi tabel analitik"
              value={form.database}
              onChange={(v) => setForm((f) => ({ ...f, database: v }))}
              placeholder="bi_staging"
            />
            <Field
              label="Username"
              hint="Akun read-only disarankan"
              value={form.username}
              onChange={(v) => setForm((f) => ({ ...f, username: v }))}
              placeholder="bi_reader"
            />
            <Field
              label="Password"
              hint="Tidak dikirim ke server kecuali saat tes/query"
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              type="password"
              placeholder="••••••••"
            />
            <Field
              label="Schema"
              hint="Biasanya public"
              value={form.schema}
              onChange={(v) => setForm((f) => ({ ...f, schema: v }))}
              placeholder="public"
            />
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.ssl}
                  onChange={(e) => setForm((f) => ({ ...f, ssl: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Gunakan SSL/TLS
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing || !form.host || !form.database || !form.username || !form.password}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="h-3.5 w-3.5" />
              )}
              Tes koneksi
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100"
            >
              Batal
            </button>
          </div>

          {testResult && (
            <div
              className={cn(
                "mx-4 mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs",
                testResult.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              )}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {tables.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-4">
              <p className="mb-2 text-xs font-medium text-slate-700">
                Pilih tabel ({tables.length} ditemukan di schema {form.schema})
              </p>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setPreview(null);
                }}
                className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                {tables.map((t) => (
                  <option key={t.fullName} value={t.name}>
                    {t.fullName}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!selectedTable || loadingPreview}
                  onClick={() => void handlePreview(buildDraftProfile())}
                  className="btn-ghost text-xs"
                >
                  <Eye className="h-3 w-3" />
                  {loadingPreview ? "Memuat…" : "Preview 5 baris"}
                </button>
                {onLoadToDashboard && (
                  <button
                    type="button"
                    disabled={!selectedTable || loadingDashboard}
                    onClick={() => void handleLoadDashboard(buildDraftProfile())}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <LayoutDashboard className="h-3 w-3" />
                    {loadingDashboard ? "Memuat…" : "Muat ke Dashboard"}
                  </button>
                )}
              </div>
              {preview && (
                <PreviewTable columns={preview.columns} rows={preview.rows} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved connections */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Koneksi tersimpan ({connections.length})
          </p>
          {connections.map((conn) => (
            <SavedConnectionCard
              key={conn.id}
              connection={conn}
              expanded={expandedId === conn.id}
              onToggle={() => setExpandedId(expandedId === conn.id ? null : conn.id)}
              onOpen={() => openExisting(conn)}
              onDelete={() => handleDelete(conn.id)}
              selectedTable={expandedId === conn.id ? selectedTable : ""}
              onTableChange={setSelectedTable}
              tables={expandedId === conn.id ? tables : []}
              onLoadTables={() => void fetchTables(conn)}
              onPreview={() => void handlePreview(conn)}
              onLoadDashboard={() => void handleLoadDashboard(conn)}
              loadingPreview={loadingPreview}
              loadingDashboard={loadingDashboard}
              preview={expandedId === conn.id ? preview : null}
              onLoadToDashboard={Boolean(onLoadToDashboard)}
            />
          ))}
        </div>
      )}

      {connections.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <Database className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-600">Belum ada koneksi database</p>
          <p className="mt-1 text-xs text-slate-400">
            Klik &quot;Koneksi Baru&quot; untuk menghubungkan PostgreSQL
          </p>
        </div>
      )}

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p>
          Gunakan akun database dengan hak <strong>SELECT saja</strong>. Maksimal 500 baris saat
          muat ke dashboard. Password koneksi disimpan terenkripsi di server.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
      />
    </label>
  );
}

function PreviewTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, string>[];
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-[10px]">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-600">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap px-2 py-1.5 text-slate-700">
                  {row[c] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SavedConnectionCard({
  connection,
  expanded,
  onToggle,
  onOpen,
  onDelete,
  tables,
  selectedTable,
  onTableChange,
  onLoadTables,
  onPreview,
  onLoadDashboard,
  loadingPreview,
  loadingDashboard,
  preview,
  onLoadToDashboard,
}: {
  connection: DatabaseConnectionProfile;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  tables: TableInfo[];
  selectedTable: string;
  onTableChange: (v: string) => void;
  onLoadTables: () => void;
  onPreview: () => void;
  onLoadDashboard: () => void;
  loadingPreview: boolean;
  loadingDashboard: boolean;
  preview: { columns: string[]; rows: Record<string, string>[] } | null;
  onLoadToDashboard: boolean;
}) {
  const statusColor =
    connection.lastTestStatus === "success"
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : connection.lastTestStatus === "failed"
        ? "text-red-600 bg-red-50 border-red-200"
        : "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <article className="surface-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Database className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-900">{connection.name}</h4>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", statusColor)}>
              {connection.lastTestStatus === "success"
                ? "Terhubung"
                : connection.lastTestStatus === "failed"
                  ? "Gagal"
                  : "Belum dites"}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
            {connection.username}@{connection.host}:{connection.port}/{connection.database}
          </p>
          {connection.lastTestMessage && (
            <p className="mt-1 text-[10px] text-slate-400">{connection.lastTestMessage}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onOpen} className="btn-ghost py-1 text-[10px]">
            Kelola
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-3 space-y-3">
          {tables.length === 0 && (
            <button type="button" onClick={onLoadTables} className="btn-ghost text-xs">
              <Table2 className="h-3 w-3" />
              Muat daftar tabel
            </button>
          )}
          {tables.length > 0 && (
            <>
              <select
                value={selectedTable}
                onChange={(e) => onTableChange(e.target.value)}
                className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                {tables.map((t) => (
                  <option key={t.fullName} value={t.name}>
                    {t.fullName}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={onPreview} className="btn-ghost text-xs">
                  <Eye className="h-3 w-3" />
                  {loadingPreview ? "…" : "Preview"}
                </button>
                {onLoadToDashboard && (
                  <button
                    type="button"
                    onClick={onLoadDashboard}
                    disabled={loadingDashboard}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <LayoutDashboard className="h-3 w-3" />
                    Muat ke Dashboard
                  </button>
                )}
              </div>
              {preview && <PreviewTable columns={preview.columns} rows={preview.rows} />}
            </>
          )}
        </div>
      )}
    </article>
  );
}
