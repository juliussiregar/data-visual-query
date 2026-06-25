"use client";

import { FolderKanban, Loader2, Plus, Settings } from "lucide-react";
import type { Project } from "@/lib/project-types";
import { projectHasSource } from "@/lib/project-source-probe";

interface WelcomeViewProps {
  project: Project | null;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  onCreateProject: () => void;
  onOpenSettings: () => void;
}

export function WelcomeView({
  project,
  loading,
  loadingMessage,
  error,
  onCreateProject,
  onOpenSettings,
}: WelcomeViewProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="mt-4 text-sm font-medium text-slate-800">
          {loadingMessage ?? "Memuat data…"}
        </p>
        <p className="mt-1 text-xs text-slate-500">Mohon tunggu sebentar</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
          <FolderKanban className="h-7 w-7 text-indigo-600" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-900">Mulai dengan project</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Pilih project di kiri atas atau buat baru. Sertakan link Google Sheet atau koneksi
          database.
        </p>
        <button type="button" onClick={onCreateProject} className="btn-primary mt-6 text-sm">
          <Plus className="h-4 w-4" />
          Buat project pertama
        </button>
      </div>
    );
  }

  if (projectHasSource(project)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
        {error ? (
          <>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="mt-2 max-w-sm text-xs text-slate-500">
              Periksa koneksi atau pengaturan sumber data project ini.
            </p>
            <button type="button" onClick={onOpenSettings} className="btn-primary mt-5 text-sm">
              <Settings className="h-4 w-4" />
              Atur sumber data
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-4 text-sm text-slate-600">Menyiapkan dashboard…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {project.name}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Hubungkan sumber data</h2>
        <p className="mt-2 text-sm text-slate-500">
          Tambahkan Google Sheet publik atau koneksi database SQL ke project ini.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2">
        <button type="button" onClick={onOpenSettings} className="btn-primary w-full text-sm">
          <Settings className="h-4 w-4" />
          Atur sumber data
        </button>
      </div>
    </div>
  );
}
