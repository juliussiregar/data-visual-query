"use client";

import { LayoutTemplate, Sparkles } from "lucide-react";
import {
  LAYOUT_TEMPLATES,
  suggestLayoutTemplate,
  type LayoutTemplateId,
} from "@/lib/layout";
import type { SheetData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LayoutTemplateBarProps {
  data: SheetData;
  activeTemplate?: LayoutTemplateId | null;
  onApply: (templateId: LayoutTemplateId) => void;
  className?: string;
}

export function LayoutTemplateBar({
  data,
  activeTemplate,
  onApply,
  className,
}: LayoutTemplateBarProps) {
  const suggested = suggestLayoutTemplate(data);

  return (
    <div className={cn("surface-card p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-medium text-slate-900">Template Dashboard</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Rekomendasi: {LAYOUT_TEMPLATES.find((t) => t.id === suggested)?.label}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {LAYOUT_TEMPLATES.map((t) => {
          const isSuggested = t.id === suggested;
          const isActive = activeTemplate === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onApply(t.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-all",
                isActive
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
              )}
            >
              <p className="text-sm font-medium text-slate-900">
                {t.label}
                {isSuggested && (
                  <span className="ml-1.5 text-[10px] font-normal text-indigo-600">· disarankan</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
