"use client";

import { Hash } from "lucide-react";

interface WidgetStatCardProps {
  label: string;
  value: string;
  compact?: boolean;
}

export function WidgetStatCard({ label, value, compact = false }: WidgetStatCardProps) {
  if (compact) {
    return (
      <div className="surface-card px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-medium text-slate-600">{label}</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <Hash className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
        <p className="mt-2 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
        <Hash className="h-6 w-6 text-indigo-500" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
    </div>
  );
}
