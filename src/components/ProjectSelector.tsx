"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FolderKanban, Plus, Settings, Trash2 } from "lucide-react";
import type { Project } from "@/lib/project-types";
import { deleteProject } from "@/lib/project-storage";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  projects: Project[];
  activeProject: Project | null;
  onSelect: (project: Project) => void;
  onCreate: () => void;
  onSettings?: () => void;
  onDeleted?: (projectId: string) => void;
  className?: string;
}

export function ProjectSelector({
  projects,
  activeProject,
  onSelect,
  onCreate,
  onSettings,
  onDeleted,
  className,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const ok = await deleteProject(pendingDelete.id);
      if (!ok) {
        toast("Gagal menghapus project", "error");
        return;
      }
      toast(`Project "${pendingDelete.name}" dihapus`);
      onDeleted?.(pendingDelete.id);
      setPendingDelete(null);
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "flex max-w-[min(240px,50vw)] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
            open
              ? "border-indigo-300 bg-indigo-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <FolderKanban className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {activeProject?.name ?? "Pilih project"}
            </p>
            <p className="truncate text-[10px] text-slate-500">{projects.length} project</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-[min(300px,90vw)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <div className="max-h-56 overflow-y-auto px-1">
              {projects.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-slate-400">Belum ada project</p>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "group flex items-center gap-0.5 rounded-lg",
                      p.id === activeProject?.id ? "bg-indigo-50" : "hover:bg-slate-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(p);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs",
                        p.id === activeProject?.id
                          ? "font-medium text-indigo-800"
                          : "text-slate-700"
                      )}
                    >
                      <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{p.name}</span>
                    </button>
                    {onDeleted && (
                      <button
                        type="button"
                        title={`Hapus ${p.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(p);
                        }}
                        className={cn(
                          "mr-1 shrink-0 rounded-md p-1.5 text-slate-300 transition-all",
                          "hover:bg-red-50 hover:text-red-600",
                          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-1 border-t border-slate-100 px-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreate();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Project baru
              </button>
              {activeProject && onSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSettings();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Pengaturan project
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onClose={() => !deleting && setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Hapus project?"
          description={`Project "${pendingDelete.name}" beserta layout dashboard-nya akan dihapus permanen.`}
          confirmLabel="Hapus project"
          variant="danger"
          loading={deleting}
        />
      )}
    </>
  );
}
