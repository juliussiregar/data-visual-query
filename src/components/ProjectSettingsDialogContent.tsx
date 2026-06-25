"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import type { Project } from "@/lib/project-types";
import { connectionToApiPayload, fetchDbConnections, removeDbConnection } from "@/lib/datasource-storage";
import { deleteProject, updateProject } from "@/lib/project-storage";
import type { ProbeResult, SourceType } from "@/lib/project-source-probe";
import { probeDatabaseTable, probeSheetUrl } from "@/lib/project-source-probe";
import { resolveProjectDbTables } from "@/lib/db-table-datasets";
import { DatabaseConnectionQuickForm } from "./DatabaseConnectionQuickForm";
import { DbTableMultiSelect } from "./DbTableMultiSelect";
import { ProjectSourceVerify } from "./ProjectSourceVerify";
import { ProjectTableRelationsEditor } from "./ProjectTableRelationsEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import type { TableRelation } from "@/lib/sql-query-types";
import { useToast } from "./ToastProvider";
import { DatabaseConnectionCard } from "./DatabaseConnectionCard";
import { cn } from "@/lib/utils";

type ConfirmTarget =
  | { kind: "connection"; connection: DatabaseConnectionProfile }
  | { kind: "project" }
  | null;

interface ProjectSettingsDialogContentProps {
  project: Project;
  onUpdated: (project: Project) => void | Promise<void>;
  onDeleted?: (projectId: string) => void;
  onLoad: () => void;
  loading?: boolean;
}

function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProjectSettingsDialogContent({
  project,
  onUpdated,
  onDeleted,
  onLoad,
  loading,
}: ProjectSettingsDialogContentProps) {
  const [projectName, setProjectName] = useState(project.name);
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionProfile[]>([]);
  const [sourceType, setSourceType] = useState<SourceType>(
    project.sheetUrls.length > 0 ? "sheet" : "database"
  );
  const [sheetUrl, setSheetUrl] = useState(project.sheetUrls[0] ?? "");
  const [selectedDbId, setSelectedDbId] = useState(project.activeDbConnectionId ?? "");
  const [dbTables, setDbTables] = useState<string[]>(resolveProjectDbTables(project));
  const [tableRelations, setTableRelations] = useState<TableRelation[]>(
    project.tableRelations ?? []
  );
  const [tables, setTables] = useState<{ schema: string; name: string; fullName: string }[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnectionProfile | null>(
    null
  );
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setProjectName(project.name);
    setDbTables(resolveProjectDbTables(project));
    setTableRelations(project.tableRelations ?? []);
  }, [project.id, project.name, project.updatedAt]);

  useEffect(() => {
    void fetchDbConnections().then((list) => {
      setDbConnections(list);
      if (list.length === 0) {
        setShowAddConnection(true);
        return;
      }
      if (!selectedDbId && list[0]) setSelectedDbId(list[0].id);
    });
  }, [selectedDbId]);

  const selectedDb = dbConnections.find((c) => c.id === selectedDbId) ?? null;

  const fetchTables = useCallback(async (profile: DatabaseConnectionProfile) => {
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
    } catch {
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    if (sourceType !== "database" || !selectedDb || showAddConnection || editingConnection) {
      setTables([]);
      return;
    }
    void fetchTables(selectedDb);
  }, [sourceType, selectedDb, showAddConnection, editingConnection, fetchTables]);

  const buildRelationsPatch = (resolvedTables: string[], relations: TableRelation[]) => {
    const hadRelations = (project.tableRelations?.length ?? 0) > 0;
    if (resolvedTables.length < 2) {
      return hadRelations ? { tableRelations: [] as TableRelation[] } : {};
    }
    if (relations.length > 0 || hadRelations) {
      return { tableRelations: relations };
    }
    return {};
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setSaveError("Nama project wajib diisi.");
      setSaving(false);
      return;
    }

    const sourcePatch =
      sourceType === "sheet"
        ? {
            sheetUrls: sheetUrl.trim() ? [sheetUrl.trim()] : [],
            mergeMode: false,
            dbConnectionIds: [] as string[],
            activeDbConnectionId: null,
            activeDbTable: null,
            activeDbTables: [] as string[],
            ...buildRelationsPatch([], []),
          }
        : selectedDb
          ? {
              sheetUrls: [] as string[],
              dbConnectionIds: [selectedDb.id],
              activeDbConnectionId: selectedDb.id,
              activeDbTables: dbTables,
              activeDbTable: dbTables[0] ?? null,
              ...buildRelationsPatch(dbTables, tableRelations),
            }
          : null;

    if (!sourcePatch) {
      setSaveError("Pilih koneksi database terlebih dahulu.");
      setSaving(false);
      return;
    }

    const patch = { name: trimmedName, ...sourcePatch };

    try {
      const updated = await updateProject(project.id, patch);
      if (!updated) throw new Error("Gagal menyimpan project");
      await onUpdated(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan project";
      setSaveError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    let result: ProbeResult;
    if (sourceType === "sheet") {
      result = await probeSheetUrl(sheetUrl);
    } else if (!selectedDb) {
      result = { ok: false as const, error: "Pilih koneksi database" };
    } else if (dbTables.length === 0) {
      result = { ok: false as const, error: "Pilih minimal satu tabel" };
    } else {
      const probes = await Promise.all(
        dbTables.map((table) => probeDatabaseTable(selectedDb, table))
      );
      const failed = probes.find((probe) => !probe.ok);
      result =
        failed && !failed.ok
          ? failed
          : {
              ok: true,
              type: "database",
              table: dbTables.join(", "),
              previewRows: 0,
              message: `${dbTables.length} tabel siap dimuat`,
            };
    }
    setProbeResult(result);
    setProbing(false);
  };

  const executeDeleteConnection = async (connection: DatabaseConnectionProfile) => {
    const ok = await removeDbConnection(connection.id);
    if (!ok) {
      toast("Gagal menghapus koneksi", "error");
      return;
    }
    const list = await fetchDbConnections();
    setDbConnections(list);
    if (selectedDbId === connection.id) {
      setSelectedDbId(list[0]?.id ?? "");
      setDbTables([]);
    }
    if (editingConnection?.id === connection.id) setEditingConnection(null);
    toast("Koneksi dihapus");
  };

  const executeDeleteProject = async () => {
    setDeleting(true);
    const ok = await deleteProject(project.id);
    setDeleting(false);
    if (!ok) {
      toast("Gagal menghapus project", "error");
      return;
    }
    toast("Project dihapus");
    onDeleted?.(project.id);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.kind === "connection") {
        await executeDeleteConnection(confirmTarget.connection);
      } else {
        await executeDeleteProject();
      }
      setConfirmTarget(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const showConnectionForm =
    showAddConnection || dbConnections.length === 0 || editingConnection !== null;

  const confirmCopy =
    confirmTarget?.kind === "connection"
      ? {
          title: "Hapus koneksi?",
          description: `Koneksi "${confirmTarget.connection.name}" akan dihapus permanen. Project yang memakainya perlu diatur ulang.`,
          confirmLabel: "Hapus koneksi",
        }
      : confirmTarget?.kind === "project"
        ? {
            title: "Hapus project?",
            description: `Project "${project.name}" beserta layout dashboard-nya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
            confirmLabel: "Hapus project",
          }
        : null;

  return (
    <>
      <div className="space-y-4">
        <SettingsSection title="Identitas project" description="Nama yang tampil di daftar project">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Contoh: Portofolio Kredit"
            className="input-field text-sm"
          />
        </SettingsSection>

        <SettingsSection
          title="Sumber data"
          description="Pilih jenis sumber lalu konfigurasi koneksinya"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSourceType("sheet")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-medium transition-colors",
                sourceType === "sheet"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <Sheet className="h-4 w-4" />
              Google Sheet
            </button>
            <button
              type="button"
              onClick={() => setSourceType("database")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-medium transition-colors",
                sourceType === "database"
                  ? "border-violet-300 bg-violet-50 text-violet-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <Database className="h-4 w-4" />
              PostgreSQL / MySQL
            </button>
          </div>

          <div className="mt-4">
            {sourceType === "sheet" ? (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-slate-700">Link sheet</span>
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="input-field text-xs"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                />
              </label>
            ) : showConnectionForm ? (
              <DatabaseConnectionQuickForm
                initialConnection={editingConnection ?? undefined}
                onSaved={(connection) => {
                  setDbConnections((prev) => [
                    connection,
                    ...prev.filter((c) => c.id !== connection.id),
                  ]);
                  setSelectedDbId(connection.id);
                  setShowAddConnection(false);
                  setEditingConnection(null);
                }}
                onCancel={
                  dbConnections.length > 0
                    ? () => {
                        setShowAddConnection(false);
                        setEditingConnection(null);
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-700">Koneksi database</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddConnection(true);
                        setEditingConnection(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Baru
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dbConnections.map((connection) => (
                      <DatabaseConnectionCard
                        key={connection.id}
                        connection={connection}
                        selected={connection.id === selectedDbId}
                        onSelect={() => setSelectedDbId(connection.id)}
                        onEdit={() => {
                          setEditingConnection(connection);
                          setShowAddConnection(false);
                        }}
                        onDelete={() =>
                          setConfirmTarget({ kind: "connection", connection })
                        }
                      />
                    ))}
                  </div>
                </div>

                {selectedDb && (
                  <div className="space-y-2 border-t border-slate-200/80 pt-4">
                    <span className="block text-[11px] font-medium text-slate-700">Tabel</span>
                    <DbTableMultiSelect
                      tables={tables}
                      selected={dbTables}
                      loading={loadingTables}
                      onChange={setDbTables}
                    />
                  </div>
                )}

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
          </div>
        </SettingsSection>

        {saveError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {probeResult && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
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

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="btn-primary text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Simpan perubahan
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

        {onDeleted && (
          <section className="rounded-xl border border-red-200/80 bg-red-50/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-semibold text-red-900">Hapus project</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-red-700/80">
                  Project &quot;{project.name}&quot; dan layout dashboard-nya akan dihapus permanen.
                  Koneksi database tidak ikut terhapus.
                </p>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmTarget({ kind: "project" })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Hapus project ini
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {confirmCopy && (
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          onClose={() => !confirmLoading && setConfirmTarget(null)}
          onConfirm={handleConfirm}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          variant="danger"
          loading={confirmLoading}
        />
      )}
    </>
  );
}
