"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Table2,
  Sheet,
  ArrowRight,
  Sparkles,
  Terminal,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { DatabaseConnectionsPanel } from "./DatabaseConnectionsPanel";
import type { SheetData } from "@/lib/types";
import type { UserRole } from "@/lib/auth";

interface DataSourceInfo {
  name: string;
  label: string;
  description: string;
  columns: string[];
}

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
  const [sources, setSources] = useState<DataSourceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/datasource")
      .then((r) => r.json())
      .then((json) => setSources(json.sources ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <SectionHeader
        title="Sumber Data"
        description="Hubungkan Google Sheet, PostgreSQL, atau mock database untuk PoC. Pilih sumber lalu muat ke dashboard untuk KPI & grafik otomatis."
      />

      {/* Google Sheets */}
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

      {/* PostgreSQL */}
      <DatabaseConnectionsPanel
        role={role}
        onLoadToDashboard={onLoadToDashboard}
        onLoadingChange={onLoadingChange}
      />

      <hr className="border-slate-100" />

      {/* Mock DB */}
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50">
            <Database className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Mock Database (PoC)</h3>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500">
              Dataset contoh hardcoded untuk demo tanpa infrastruktur. Gunakan tab{" "}
              <strong>SQL</strong> untuk query read-only — cocok untuk uji coba fitur analitik
              sebelum koneksi PostgreSQL siap.
            </p>
          </div>
        </div>

        {loading && (
          <div className="surface-card p-8 text-center text-sm text-slate-500">
            Memuat mock database…
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {sources.map((src) => (
            <article key={src.name} className="surface-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
                  <Table2 className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900">{src.label}</h4>
                  <p className="mt-1 text-xs text-slate-500">{src.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-violet-600">tabel: {src.name}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {src.columns.map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-100"
                  >
                    <Table2 className="h-2.5 w-2.5 opacity-50" />
                    {col}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Terminal className="h-3.5 w-3.5 text-violet-500" />
            Contoh query SQL (tab SQL · role Analyst/Admin)
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-slate-600">
{`SELECT * FROM portofolio_kredit WHERE Region = 'Jabotabek' LIMIT 10
SELECT No_Fasilitas, Outstanding FROM portofolio_kredit LIMIT 5`}
          </pre>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
            <ArrowRight className="h-3 w-3" />
            Buka tab SQL di sidebar untuk menjalankan query mock atau PostgreSQL
          </p>
        </div>
      </section>
    </div>
  );
}
