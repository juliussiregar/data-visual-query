"use client";

import { useMemo } from "react";
import { ChevronDown, ExternalLink, Pencil, Plus, Server, Trash2 } from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import { databaseTypeLabel } from "@/lib/connectors/sql-types";
import { cn } from "@/lib/utils";

function connectionTypeBadgeClass(type: DatabaseConnectionProfile["type"]): string {
  if (type === "mysql") return "bg-amber-100 text-amber-800";
  if (type === "mariadb") return "bg-rose-100 text-rose-800";
  return "bg-sky-100 text-sky-800";
}

interface DatabaseConnectionPickerProps {
  connections: DatabaseConnectionProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onEdit: (connection: DatabaseConnectionProfile) => void;
  onDelete?: (connection: DatabaseConnectionProfile) => void;
  /** Tutup dialog & buka tab Sumber untuk kelola koneksi global */
  onOpenSources?: () => void;
  label?: string;
}

export function DatabaseConnectionPicker({
  connections,
  selectedId,
  onSelect,
  onAddNew,
  onEdit,
  onDelete,
  onOpenSources,
  label = "Koneksi project",
}: DatabaseConnectionPickerProps) {
  const selected = useMemo(
    () => connections.find((c) => c.id === selectedId) ?? connections[0] ?? null,
    [connections, selectedId]
  );

  if (connections.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">{label}</span>
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Baru
          </button>
        </div>
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-xs text-slate-500">
          Belum ada koneksi database. Tambahkan koneksi untuk memilih tabel.
        </p>
      </div>
    );
  }

  const active = selected ?? connections[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-700">{label}</span>
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Baru
        </button>
      </div>

      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{active.name}</p>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                  connectionTypeBadgeClass(active.type)
                )}
              >
                {databaseTypeLabel(active.type)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {active.host}:{active.port} · {active.database}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-violet-200/60 pt-3">
          {connections.length > 1 ? (
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="db-connection-switch">
                Ganti koneksi
              </label>
              <div className="relative">
                <select
                  id="db-connection-switch"
                  value={active.id}
                  onChange={(e) => onSelect(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-[11px] font-medium text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                >
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name} ({databaseTypeLabel(connection.type)})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
              </div>
            </div>
          ) : (
            <p className="flex-1 text-[10px] text-slate-500">Koneksi aktif untuk project ini</p>
          )}

          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              title="Edit koneksi"
              onClick={() => onEdit(active)}
              className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-violet-700"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onDelete ? (
              <button
                type="button"
                title="Hapus koneksi"
                onClick={() => onDelete(active)}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {onOpenSources ? (
        <button
          type="button"
          onClick={onOpenSources}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-violet-700"
        >
          <ExternalLink className="h-3 w-3" />
          Kelola semua koneksi di tab Sumber
        </button>
      ) : null}
    </div>
  );
}
