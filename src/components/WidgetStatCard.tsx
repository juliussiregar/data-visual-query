"use client";

import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetStatCardProps {
  label: string;
  value: string;
  compact?: boolean;
}

export function WidgetStatCard({ label, value, compact = false }: WidgetStatCardProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-6" : "px-6 py-10"
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-center rounded-2xl bg-indigo-50",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <Hash className={cn("text-indigo-500", compact ? "h-5 w-5" : "h-6 w-6")} />
      </div>
      <p
        className={cn(
          "font-bold tracking-tight text-slate-900",
          compact ? "text-2xl" : "text-3xl sm:text-4xl"
        )}
      >
        {value}
      </p>
      <p className={cn("mt-2 text-slate-500", compact ? "text-xs" : "text-sm")}>{label}</p>
    </div>
  );
}
