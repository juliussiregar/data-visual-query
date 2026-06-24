"use client";

import { useState } from "react";
import { Layers, X } from "lucide-react";
import type { DashboardLayout } from "@/lib/types";
import { getSavedSheets } from "@/lib/sheet-storage";

interface MultiSheetPanelProps {
  layout: DashboardLayout;
  sheetUrls: string[];
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReloadMerged: () => void;
}

export function MultiSheetPanel({
  layout,
  sheetUrls,
  onAddSheet,
  onRemoveSheet,
  onToggleMerge,
  onReloadMerged,
}: MultiSheetPanelProps) {
  const [open, setOpen] = useState(false);
  const [sheetInput, setSheetInput] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-xs text-slate-500 hover:border-cyan-500/30 hover:text-cyan-300"
      >
        <Layers className="h-3.5 w-3.5" />
        Gabung beberapa Google Sheet (opsional)
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          Gabung Sheet
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-[10px] text-slate-500">
        Untuk membandingkan atau menggabungkan data dari lebih dari satu sheet
      </p>
      <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={layout.mergeMode}
          onChange={(e) => onToggleMerge(e.target.checked)}
          className="rounded accent-cyan-500"
        />
        Gabungkan semua sheet jadi satu tabel
      </label>
      <ul className="mb-2 space-y-1">
        {sheetUrls.map((url) => (
          <li
            key={url}
            className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/50 px-2 py-1.5 text-[10px] text-slate-400"
          >
            <span className="truncate">{url}</span>
            {sheetUrls.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveSheet(url)}
                className="shrink-0 text-red-400 hover:text-red-300"
              >
                Hapus
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={sheetInput}
          onChange={(e) => setSheetInput(e.target.value)}
          placeholder="Paste link sheet kedua..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white"
        />
        <button
          type="button"
          onClick={() => {
            if (sheetInput.trim()) {
              onAddSheet(sheetInput.trim());
              setSheetInput("");
            }
          }}
          className="shrink-0 rounded-lg bg-cyan-500/20 px-3 py-2 text-xs text-cyan-200"
        >
          Tambah
        </button>
      </div>
      {getSavedSheets()
        .filter((s) => !sheetUrls.includes(s.url))
        .slice(0, 4)
        .map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onAddSheet(s.url)}
            className="mt-2 mr-1 inline-block rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:border-cyan-500/30"
          >
            + {s.label}
          </button>
        ))}
      {layout.mergeMode && sheetUrls.length > 1 && (
        <button
          type="button"
          onClick={onReloadMerged}
          className="mt-2 block text-[10px] text-cyan-300 hover:underline"
        >
          Muat ulang data gabungan
        </button>
      )}
    </div>
  );
}
