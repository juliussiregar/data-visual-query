"use client";

import { BookOpen, BadgeCheck } from "lucide-react";
import { METRIC_GLOSSARY, type GlossaryCategory } from "@/lib/metric-glossary";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  generic: "Umum",
  banking: "Contoh Banking",
  quality: "Kualitas Data",
};

export function MetricGlossaryPanel() {
  const byCategory = {
    generic: METRIC_GLOSSARY.filter((e) => e.category === "generic"),
    quality: METRIC_GLOSSARY.filter((e) => e.category === "quality"),
    banking: METRIC_GLOSSARY.filter((e) => e.category === "banking"),
  };

  return (
    <section className="surface-section p-4 sm:p-5">
      <SectionHeader
        title="Glosarium Metrik"
        description={
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
            Definisi resmi & draft — acuan konsistensi perhitungan
          </span>
        }
        className="mb-4 border-none pb-0"
      />

      <div className="space-y-6">
        {(Object.keys(byCategory) as GlossaryCategory[]).map((cat) => (
          <div key={cat}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABEL[cat]}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {byCategory[cat].map((entry) => (
                <article key={entry.id} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold text-slate-900">{entry.name}</h5>
                    <span
                      className={cn(
                        "badge shrink-0 normal-case tracking-normal",
                        entry.status === "certified"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      )}
                    >
                      {entry.status === "certified" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <BadgeCheck className="h-3 w-3" />
                          Certified
                        </span>
                      ) : (
                        "Draft"
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {entry.description}
                  </p>
                  <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 font-mono text-[10px] text-slate-600 ring-1 ring-slate-100">
                    {entry.formula}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                    <span>{entry.unit}</span>
                    {entry.owner && <span>Owner: {entry.owner}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
