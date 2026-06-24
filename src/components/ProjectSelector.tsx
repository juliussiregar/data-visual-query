"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FolderKanban, Plus, Settings } from "lucide-react";
import type { Project } from "@/lib/project-types";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  projects: Project[];
  activeProject: Project | null;
  onSelect: (project: Project) => void;
  onCreate: () => void;
  onSettings?: () => void;
  className?: string;
}

export function ProjectSelector({
  projects,
  activeProject,
  onSelect,
  onCreate,
  onSettings,
  className,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
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
          <p className="truncate text-[10px] text-slate-500">
            {projects.length} project
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[min(280px,90vw)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <div className="max-h-52 overflow-y-auto px-1">
            {projects.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">Belum ada project</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs",
                    p.id === activeProject?.id
                      ? "bg-indigo-50 font-medium text-indigo-800"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{p.name}</span>
                </button>
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
                Atur sumber data
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
