"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import {
  connectionToApiPayload,
  fetchDbConnections,
} from "@/lib/datasource-storage";
import { createProject } from "@/lib/project-storage";
import type { Project } from "@/lib/project-types";
import type { ProbeResult, SourceType } from "@/lib/project-source-probe";
import { probeDatabaseTable, probeSheetUrl } from "@/lib/project-source-probe";
import { DatabaseConnectionQuickForm } from "./DatabaseConnectionQuickForm";
import { DbTableMultiSelect } from "./DbTableMultiSelect";
import { ProjectTableRelationsEditor } from "./ProjectTableRelationsEditor";
import type { TableRelation } from "@/lib/sql-query-types";
import { cn } from "@/lib/utils";

type Phase = "form" | "checking" | "creating" | "done" | "error";

interface TableInfo {
  schema: string;
  name: string;
  fullName: string;
}

interface ProjectCreateWizardProps {
  onCreated: (project: Project) => void;
  onCancel: () => void;
  compact?: boolean;
}

export function ProjectCreateWizard({ onCreated, onCancel, compact }: ProjectCreateWizardProps) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("sheet");
  const [sheetUrl, setSheetUrl] = useState("");
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionProfile[]>([]);
  const [selectedDbId, setSelectedDbId] = useState("");
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [tableRelations, setTableRelations] = useState<TableRelation[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const refreshConnections = useCallback(async () => {
    const list = await fetchDbConnections();
    setDbConnections(list);
    if (list.length === 0) {
      setShowAddConnection(true);
      setSelectedDbId("");
      return list;
    }
    setShowAddConnection(false);
    setSelectedDbId((current) => {
      if (current && list.some((c) => c.id === current)) return current;
      return list[0]?.id ?? "";
    });
    return list;
  }, []);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  const selectedDb = dbConnections.find((c) => c.id === selectedDbId) ?? null;

  const fetchTables = useCallback(async (profile: DatabaseConnectionProfile) => {
    setLoadingTables(true);
    setTables([]);
    try {
      const res = await fetch("/api/datasource/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionToApiPayload(profile)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const nextTables: TableInfo[] = json.tables ?? [];
      setTables(nextTables);
      setDbTables(nextTables[0] ? [nextTables[0].name] : []);
    } catch {
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    if (sourceType !== "database" || !selectedDb || showAddConnection) {
      setTables([]);
      return;
    }
    void fetchTables(selectedDb);
  }, [sourceType, selectedDb, showAddConnection, fetchTables]);

  const canSubmit =
    name.trim() &&
    (sourceType === "sheet"
      ? sheetUrl.trim()
      : selectedDb && dbTables.length > 0 && !showAddConnection);

  const handleConnectionSaved = async (connection: DatabaseConnectionProfile) => {
    await refreshConnections();
    setSelectedDbId(connection.id);
    setShowAddConnection(false);
    setDbTables([]);
    void fetchTables(connection);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPhase("checking");
    setProbeResult(null);
    setErrorMsg("");

    let result: ProbeResult;
    if (sourceType === "sheet") {
      result = await probeSheetUrl(sheetUrl);
    } else if (!selectedDb) {
      result = { ok: false as const, error: "Pilih koneksi database" };
    } else {
      const probes = await Promise.all(
        dbTables.map((table) => probeDatabaseTable(selectedDb, table))
      );
      const failed = probes.find((probe) => !probe.ok);
      if (failed && !failed.ok) {
        result = failed;
      } else {
        const okProbes = probes.filter((probe): probe is Extract<ProbeResult, { ok: true }> => probe.ok);
        const tableLabels = okProbes
          .map((probe) => (probe.type === "database" ? probe.table : ""))
          .filter(Boolean)
          .join(", ");
        result = {
          ok: true,
          type: "database",
          table: tableLabels,
          previewRows: okProbes.reduce(
            (sum, probe) => sum + (probe.type === "database" ? probe.previewRows : 0),
            0
          ),
          message: `${okProbes[0]?.message ?? "Database terhubung"} · ${dbTables.length} tabel siap dimuat`,
        };
      }
    }

    if (!result.ok) {
      setProbeResult(result);
      setPhase("error");
      return;
    }

    setProbeResult(result);
    setPhase("creating");

    try {
      const project = await createProject(name.trim(), {
        ...(sourceType === "sheet"
          ? { sheetUrls: [sheetUrl.trim()] }
          : selectedDb
            ? {
                dbConnectionIds: [selectedDb.id],
                activeDbConnectionId: selectedDb.id,
                activeDbTables: dbTables,
                activeDbTable: dbTables[0] ?? null,
                tableRelations,
              }
            : {}),
      });

      if (!project) {
        setErrorMsg("Gagal menyimpan project");
        setPhase("error");
        return;
      }

      setPhase("done");
      onCreated(project);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan project");
      setPhase("error");
    }
  };

  if (phase === "checking" || phase === "creating" || phase === "done") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="mt-4 text-sm font-medium text-slate-800">
          {phase === "checking" && "Memeriksa koneksi…"}
          {phase === "creating" && "Menyimpan project…"}
          {phase === "done" && "Memuat dashboard…"}
        </p>
        {probeResult?.ok && (
          <p className="mt-1 max-w-xs text-xs text-emerald-600">{probeResult.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nama project</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Portofolio Kredit"
          className="input-field text-sm"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSourceType("sheet")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium",
            sourceType === "sheet"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-200 text-slate-600"
          )}
        >
          <Sheet className="h-3.5 w-3.5" />
          Google Sheet
        </button>
        <button
          type="button"
          onClick={() => setSourceType("database")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium",
            sourceType === "database"
              ? "border-violet-300 bg-violet-50 text-violet-800"
              : "border-slate-200 text-slate-600"
          )}
        >
          <Database className="h-3.5 w-3.5" />
          PostgreSQL / MySQL
        </button>
      </div>

      {sourceType === "sheet" ? (
        <input
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="Paste link Google Sheet…"
          className="input-field text-xs"
        />
      ) : showAddConnection || dbConnections.length === 0 ? (
        <DatabaseConnectionQuickForm
          compact={compact}
          onSaved={(connection) => void handleConnectionSaved(connection)}
          onCancel={
            dbConnections.length > 0
              ? () => setShowAddConnection(false)
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-700">Koneksi database</span>
              <select
                value={selectedDbId}
                onChange={(e) => setSelectedDbId(e.target.value)}
                className="input-field text-xs"
              >
                {dbConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowAddConnection(true)}
              className="btn-ghost shrink-0 gap-1 py-2 text-[11px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Baru
            </button>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700">Tabel</span>
            <DbTableMultiSelect
              tables={tables}
              selected={dbTables}
              loading={loadingTables}
              onChange={(next) => {
                setDbTables(next);
                setTableRelations((prev) =>
                  prev.filter(
                    (r) =>
                      next.includes(r.baseTable) &&
                      r.joins.every((j) => next.includes(j.table))
                  )
                );
              }}
              compact={compact}
            />
          </div>
          {dbTables.length >= 2 && (
            <ProjectTableRelationsEditor
              dbTables={dbTables}
              relations={tableRelations}
              connection={selectedDb}
              onChange={setTableRelations}
            />
          )}
        </div>
      )}

      {(probeResult && !probeResult.ok) || errorMsg ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg || (probeResult && !probeResult.ok ? probeResult.error : "")}</span>
        </div>
      ) : null}

      {probeResult?.ok && phase === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{probeResult.message}</span>
        </div>
      )}

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs">
          Batal
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="btn-primary ml-auto text-xs"
        >
          Buat & muat data
        </button>
      </div>
    </div>
  );
}
