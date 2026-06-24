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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 sm:px-5">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-300">{widgetCount} widget</span> aktif di
        dashboard
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopyLink}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          {linkCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
          {linkCopied ? "Tersalin" : "Bagikan"}
        </button>
        <button
          type="button"
          onClick={onOpenBuilder}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-500/25"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Tambah / Atur Widget
        </button>
      </div>
    </div>
  );
}
