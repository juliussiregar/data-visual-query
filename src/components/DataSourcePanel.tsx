"use client";

import { Sheet, Sparkles } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { DatabaseConnectionsPanel } from "./DatabaseConnectionsPanel";
import type { SheetData } from "@/lib/types";
import type { UserRole } from "@/lib/auth";

interface DataSourcePanelProps {
  role: UserRole;
  onLoadToDashboard?: (data: SheetData) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function DataSourcePanel({
  role,
  onLoadToDashboard,
  onLoadingChange,
}: DataSourcePanelProps) {
  return (
    <div className="space-y-10">
      <SectionHeader
        title="Sumber Data"
        description="Hubungkan Google Sheet atau PostgreSQL, lalu muat ke dashboard untuk KPI & grafik otomatis."
      />

      <section className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Sheet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Google Sheets</h3>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500">
              Tempel URL sheet publik di halaman utama. Sheet harus dapat diakses tanpa login
              (Anyone with the link). Data dianalisis otomatis — tipe kolom, KPI, dan grafik
              disarankan oleh engine analitik.
            </p>
          </div>
        </div>
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-800">Cara pakai:</span> kembali ke beranda →
            tempel link → Enter
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <Sparkles className="h-3 w-3" />
            Tanpa konfigurasi tambahan
          </span>
        </div>
      </section>

      <hr className="border-slate-100" />

      <DatabaseConnectionsPanel
        role={role}
        onLoadToDashboard={onLoadToDashboard}
        onLoadingChange={onLoadingChange}
      />
    </div>
  );
}
