"use client";

import { Check, Pencil, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutEditToolbarProps {
  widgetCount: number;
  linkCopied: boolean;
  onOpenBuilder: () => void;
  onCopyLink: () => void;
}

export function LayoutEditToolbar({
  widgetCount,
  linkCopied,
  onOpenBuilder,
  onCopyLink,
}: LayoutEditToolbarProps) {
  if (widgetCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 surface-card px-4 py-3">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-600">{widgetCount}</span> widget
        {widgetCount !== 1 ? "s" : ""} on this overview
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopyLink}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          {linkCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {linkCopied ? "Copied" : "Share"}
        </button>
        <button
          type="button"
          onClick={onOpenBuilder}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-500/25"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit widgets
        </button>
      </div>
    </div>
  );
}
