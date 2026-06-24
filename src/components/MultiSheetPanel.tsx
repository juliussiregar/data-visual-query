"use client";

import { useState } from "react";
import { Layers, X } from "lucide-react";
import type { DashboardLayout } from "@/lib/types";

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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
      >
        <Layers className="h-3.5 w-3.5" />
        Gabung beberapa Google Sheet (opsional)
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Layers className="h-3.5 w-3.5 text-indigo-600" />
          Gabung Sheet
        </p>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-0.5 text-slate-400 hover:bg-white hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-[10px] leading-relaxed text-slate-500">
        Bandingkan atau gabungkan data dari lebih dari satu sheet
      </p>
      <label className="mb-3 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={layout.mergeMode}
          onChange={(e) => onToggleMerge(e.target.checked)}
          className="rounded accent-indigo-600"
        />
        Gabungkan semua sheet jadi satu tabel
      </label>
      <ul className="mb-2 space-y-1">
        {sheetUrls.map((url) => (
          <li
            key={url}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-600"
          >
            <span className="truncate">{url}</span>
            {sheetUrls.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveSheet(url)}
                className="shrink-0 font-medium text-red-500 hover:text-red-700"
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
          className="input-field min-w-0 flex-1 py-2 text-xs"
        />
        <button
          type="button"
          onClick={() => {
            if (sheetInput.trim()) {
              onAddSheet(sheetInput.trim());
              setSheetInput("");
            }
          }}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
        >
          Tambah
        </button>
      </div>
      {layout.mergeMode && sheetUrls.length > 1 && (
        <button
          type="button"
          onClick={onReloadMerged}
          className="mt-2 block text-[10px] font-medium text-indigo-600 hover:underline"
        >
          Muat ulang data gabungan
        </button>
      )}
    </div>
  );
}
