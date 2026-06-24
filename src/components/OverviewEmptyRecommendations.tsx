"use client";

import { LayoutGrid, Plus, Sparkles } from "lucide-react";
import type { SheetData } from "@/lib/types";
import { DASHBOARD_TEMPLATES } from "@/lib/dashboard-templates";
import { ShapeSilhouette } from "./WidgetSilhouette";
import { cn } from "@/lib/utils";

interface OverviewEmptyRecommendationsProps {
  data: SheetData;
  onOpenBuilder: () => void;
  onApplyTemplate: (templateId: string) => void;
}

export function OverviewEmptyRecommendations({
  data,
  onOpenBuilder,
  onApplyTemplate,
}: OverviewEmptyRecommendationsProps) {
  return (
    <div className="space-y-6">
      <div className="overview-empty flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
          <LayoutGrid className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">Your overview is empty</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          {data.rows.length.toLocaleString()} rows loaded. Start from a template or add widgets one
          by one.
        </p>
        <button
          type="button"
          onClick={onOpenBuilder}
          className="btn-primary mt-6 gap-2 px-6 py-3 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add widget
        </button>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">Start from a template</h3>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Pre-built layouts using your columns — you can edit every widget after applying.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {DASHBOARD_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onApplyTemplate(template.id)}
              className={cn(
                "group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition-all",
                "hover:border-indigo-300 hover:shadow-md hover:ring-2 hover:ring-indigo-100"
              )}
            >
              <div className="mb-3 flex gap-1.5">
                {template.shapes.slice(0, 4).map((shape, i) => (
                  <ShapeSilhouette
                    key={`${template.id}-${shape}-${i}`}
                    shape={shape}
                    compact
                    className="w-12 shrink-0 !p-1"
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                {template.name}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {template.description}
              </p>
              <p className="mt-2 text-[10px] font-medium text-indigo-600">
                {template.shapes.length} widgets →
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
