"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, X, AlertCircle } from "lucide-react";
import type { SheetData, WidgetProposal } from "@/lib/types";
import { normalizeWidgetProposal, buildWidgetConfigFromProposal, validateWidgetProposal, describeWidgetProposal, proposalSheetData } from "@/lib/widget-proposal";
import { widgetPreviewSummary } from "@/lib/widget-data";
import { WidgetPreview } from "./WidgetPreview";
import { cn } from "@/lib/utils";
import type { DashboardLayout } from "@/lib/types";

interface ChatWidgetPreviewModalProps {
  open: boolean;
  proposal: WidgetProposal;
  data: SheetData;
  layout: DashboardLayout;
  /** Datasets per tabel (project multi-tabel) untuk preview tabel sumber yang benar */
  dbDatasets?: Record<string, SheetData> | null;
  onClose: () => void;
  /** Tanpa onConfirm → modal jadi view-only (mis. preview dari daftar multi-widget). */
  onConfirm?: () => void;
  onReject?: () => void;
}

export function ChatWidgetPreviewModal({
  open,
  proposal,
  data,
  layout,
  dbDatasets,
  onClose,
  onReject,
  onConfirm,
}: ChatWidgetPreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const isDelete = proposal.operation === "delete";
  const resolved = normalizeWidgetProposal(proposal, layout, data);
  // Preview & validasi memakai dataset tabel sumber widget (project multi-tabel).
  const tableData = proposalSheetData(resolved, data, layout, dbDatasets);
  const draft = isDelete ? null : buildWidgetConfigFromProposal(resolved, data, layout, dbDatasets);
  const validationError = validateWidgetProposal(resolved, data, layout, dbDatasets);
  const canConfirm = !validationError && (isDelete || draft !== null);

  return createPortal(
    <div className="layer-modal fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Tutup preview"
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="widget-preview-title"
        className="chat-pop-in relative flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                <Eye className="h-3 w-3" />
                Preview widget
              </p>
              <h2 id="widget-preview-title" className="text-base font-bold text-slate-900">
                {describeWidgetProposal(proposal, data.columns)}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{proposal.summary}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/80 hover:text-slate-700"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">{proposal.validationQuestion}</p>
          </div>

          {validationError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {validationError}
            </div>
          )}

          {isDelete ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-red-800">
                Widget akan dihapus dari dashboard Overview.
              </p>
              <p className="mt-1 text-xs text-red-600">ID: {proposal.widgetId}</p>
            </div>
          ) : draft ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{widgetPreviewSummary(tableData, draft)}</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <WidgetPreview data={tableData} widget={draft} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
          {onConfirm ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onReject?.();
                  onClose();
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Belum sesuai — ubah lagi
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all",
                  canConfirm
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-emerald-500/30"
                    : "cursor-not-allowed bg-slate-300"
                )}
              >
                <Check className="h-4 w-4" />
                {isDelete ? "Ya, hapus widget" : "Ya, terapkan ke dashboard"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
