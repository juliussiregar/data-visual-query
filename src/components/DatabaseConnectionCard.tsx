"use client";

import { Pencil, Server, Trash2 } from "lucide-react";
import type { DatabaseConnectionProfile } from "@/lib/types";
import { databaseTypeLabel } from "@/lib/connectors/sql-types";
import { cn } from "@/lib/utils";

interface DatabaseConnectionCardProps {
  connection: DatabaseConnectionProfile;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DatabaseConnectionCard({
  connection,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: DatabaseConnectionCardProps) {
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3 transition-colors",
        selected
          ? "border-violet-300 bg-violet-50/80 ring-1 ring-violet-200"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
          )}
        >
          <Server className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900">{connection.name}</p>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                connection.type === "mysql"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-sky-100 text-sky-800"
              )}
            >
              {databaseTypeLabel(connection.type)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {connection.host}:{connection.port} · {connection.database}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-80 sm:group-hover:opacity-100">
        <button
          type="button"
          title="Edit koneksi"
          onClick={onEdit}
          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-violet-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Hapus koneksi"
          onClick={onDelete}
          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
