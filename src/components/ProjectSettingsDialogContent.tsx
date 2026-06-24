"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { Project } from "@/lib/project-types";
import { fetchDbConnections } from "@/lib/datasource-storage";
import { updateProject } from "@/lib/project-storage";
import type { ProbeResult, SourceType } from "@/lib/project-source-probe";
import { probeDatabaseTable, probeSheetUrl } from "@/lib/project-source-probe";
import { ProjectSourceVerify } from "./ProjectSourceVerify";
import { cn } from "@/lib/utils";

interface ProjectSettingsDialogContentProps {
  project: Project;
  onUpdated: (project: Project) => void;
  onLoad: () => void;
  loading?: boolean;
}

export function ProjectSettingsDialogContent({
  project,
  onUpdated,
  onLoad,
  loading,
}: ProjectSettingsDialogContentProps) {
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionProfile[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>(
    project.sheetUrls.length > 0 ? "sheet" : "database"
  );
  const [sheetUrl, setSheetUrl] = useState(project.sheetUrls[0] ?? "");
  const [selectedDbId, setSelectedDbId] = useState(project.activeDbConnectionId ?? "");
  const [dbTable, setDbTable] = useState(project.activeDbTable ?? "");
  const [saving, setSaving] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    void fetchDbConnections().then((list) => {
      setDbConnections(list);
      if (!selectedDbId && list[0]) setSelectedDbId(list[0].id);
    });
  }, [selectedDbId]);

  const selectedDb = dbConnections.find((c) => c.id === selectedDbId) ?? null;

  const handleSave = async () => {
    setSaving(true);
    const patch =
      sourceType === "sheet"
        ? {
            sheetUrls: sheetUrl.trim() ? [sheetUrl.trim()] : [],
            mergeMode: false,
            dbConnectionIds: [] as string[],
            activeDbConnectionId: null,
            activeDbTable: null,
          }
        : selectedDb
          ? {
              sheetUrls: [] as string[],
              dbConnectionIds: [selectedDb.id],
              activeDbConnectionId: selectedDb.id,
              activeDbTable: dbTable.trim() || null,
            }
          : {};
    const updated = await updateProject(project.id, patch);
    setSaving(false);
    if (updated) onUpdated(updated);
  };

  const handleProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    const result =
      sourceType === "sheet"
        ? await probeSheetUrl(sheetUrl)
        : selectedDb
          ? await probeDatabaseTable(selectedDb, dbTable)
          : { ok: false as const, error: "Pilih koneksi database" };
    setProbeResult(result);
    setProbing(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSourceType("sheet")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium",
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
            "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium",
            sourceType === "database"
              ? "border-violet-300 bg-violet-50 text-violet-800"
              : "border-slate-200 text-slate-600"
          )}
        >
          <Database className="h-3.5 w-3.5" />
          PostgreSQL
        </button>
      </div>

      {sourceType === "sheet" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Link sheet</label>
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="input-field text-xs"
            placeholder="https://docs.google.com/spreadsheets/d/…"
          />
        </div>
      ) : dbConnections.length === 0 ? (
        <p className="text-xs text-slate-500">
          Belum ada koneksi. Tambahkan di menu <strong>Sumber</strong> di sidebar.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Koneksi</label>
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
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tabel</label>
            <input
              value={dbTable}
              onChange={(e) => setDbTable(e.target.value)}
              className="input-field text-xs"
              placeholder="schema.table"
            />
          </div>
        </div>
      )}

      {probeResult && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            probeResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {probeResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{probeResult.ok ? probeResult.message : probeResult.error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="btn-primary text-xs"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Simpan
        </button>
        <button
          type="button"
          disabled={probing}
          onClick={() => void handleProbe()}
          className="btn-ghost border border-slate-200 text-xs"
        >
          {probing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Cek koneksi
        </button>
      </div>

      <ProjectSourceVerify
        project={project}
        dbConnections={dbConnections}
        loading={loading}
        onLoad={onLoad}
      />
    </div>
  );
}
