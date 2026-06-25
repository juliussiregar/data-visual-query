"use client";

import { useEffect, useState } from "react";
import { Loader2, Plug, Play, CheckCircle2, XCircle } from "lucide-react";
import type { Project } from "@/lib/project-types";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { ProbeResult } from "@/lib/project-source-probe";
import {
  probeDatabaseTable,
  probeSheetUrl,
  projectHasSource,
  projectSourceType,
} from "@/lib/project-source-probe";
import { resolveProjectDbTables } from "@/lib/db-table-datasets";
import { cn } from "@/lib/utils";

interface ProjectSourceVerifyProps {
  project: Project;
  dbConnections: DatabaseConnectionProfile[];
  loading?: boolean;
  onLoad: () => void;
}

export function ProjectSourceVerify({
  project,
  dbConnections,
  loading,
  onLoad,
}: ProjectSourceVerifyProps) {
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);

  const hasSource = projectHasSource(project);
  const sourceType = projectSourceType(project);

  useEffect(() => {
    setProbeResult(null);
  }, [
    project.id,
    project.sheetUrls.join("|"),
    project.activeDbConnectionId,
    project.activeDbTables.join("|"),
    project.activeDbTable,
    project.tableRelations?.map((r) => r.id).join("|") ?? "",
  ]);

  const handleProbe = async () => {
    if (!hasSource || !sourceType) return;
    setProbing(true);
    setProbeResult(null);

    let result: ProbeResult;
    if (sourceType === "sheet") {
      result = await probeSheetUrl(project.sheetUrls[0]);
    } else {
      const conn = dbConnections.find((c) => c.id === project.activeDbConnectionId);
      if (!conn) {
        result = { ok: false, error: "Koneksi database tidak ditemukan. Hubungkan ulang di tab Sumber." };
      } else {
        const tables = resolveProjectDbTables(project);
        const probes = await Promise.all(
          tables.map((table) => probeDatabaseTable(conn, table))
        );
        const failed = probes.find((probe) => !probe.ok);
        result =
          failed && !failed.ok
            ? failed
            : {
                ok: true,
                type: "database",
                table: tables.join(", "),
                previewRows: 0,
                message: `${tables.length} tabel siap dimuat`,
              };
      }
    }

    setProbeResult(result);
    setProbing(false);
  };

  const verified = probeResult?.ok === true;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-900">Verifikasi sumber data</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Cek apakah Google Sheet dapat dibuka atau database dapat terhubung sebelum membuka
          dashboard.
        </p>
      </div>

      {!hasSource && (
        <p className="text-xs text-amber-700">
          Tambahkan link Google Sheet atau hubungkan database SQL terlebih dahulu.
        </p>
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
          <p>{probeResult.ok ? probeResult.message : probeResult.error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasSource || probing}
          onClick={() => void handleProbe()}
          className="btn-ghost border border-slate-200 text-xs"
        >
          {probing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug className="h-3.5 w-3.5" />
          )}
          Cek koneksi
        </button>
        <button
          type="button"
          disabled={!verified || loading}
          onClick={onLoad}
          className="btn-primary text-xs"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Buka Dashboard
        </button>
      </div>
    </div>
  );
}
