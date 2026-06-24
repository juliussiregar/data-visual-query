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
import { fetchDbConnections } from "@/lib/datasource-storage";
import { createProject } from "@/lib/project-storage";
import type { Project } from "@/lib/project-types";
import type { ProbeResult, SourceType } from "@/lib/project-source-probe";
import { probeDatabaseTable, probeSheetUrl } from "@/lib/project-source-probe";
import { cn } from "@/lib/utils";

type Phase = "form" | "checking" | "creating" | "done" | "error";

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
  const [dbTable, setDbTable] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void fetchDbConnections().then((list) => {
      setDbConnections(list);
      if (list[0]) setSelectedDbId(list[0].id);
    });
  }, []);

  const selectedDb = dbConnections.find((c) => c.id === selectedDbId) ?? null;

  const canSubmit =
    name.trim() &&
    (sourceType === "sheet" ? sheetUrl.trim() : selectedDb && dbTable.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPhase("checking");
    setProbeResult(null);
    setErrorMsg("");

    const result =
      sourceType === "sheet"
        ? await probeSheetUrl(sheetUrl)
        : selectedDb
          ? await probeDatabaseTable(selectedDb, dbTable)
          : { ok: false as const, error: "Pilih koneksi database" };

    if (!result.ok) {
      setProbeResult(result);
      setPhase("error");
      return;
    }

    setProbeResult(result);
    setPhase("creating");

    const project = await createProject(name.trim(), {
      ...(sourceType === "sheet"
        ? { sheetUrls: [sheetUrl.trim()] }
        : selectedDb
          ? {
              dbConnectionIds: [selectedDb.id],
              activeDbConnectionId: selectedDb.id,
              activeDbTable: dbTable.trim(),
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
          PostgreSQL
        </button>
      </div>

      {sourceType === "sheet" ? (
        <input
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="Paste link Google Sheet…"
          className="input-field text-xs"
        />
      ) : dbConnections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
          Tambahkan koneksi DB di menu <strong>Sumber</strong> terlebih dahulu.
        </p>
      ) : (
        <div className="space-y-2">
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
          <input
            value={dbTable}
            onChange={(e) => setDbTable(e.target.value)}
            placeholder="Nama tabel (schema.table)"
            className="input-field text-xs"
          />
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
