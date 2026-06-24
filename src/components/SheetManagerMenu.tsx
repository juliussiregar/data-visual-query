"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sheet,
  ChevronDown,
  Copy,
  Check,
  Layers,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Pencil,
  Loader2,
} from "lucide-react";
import { truncateUrl, deriveSheetLabel } from "@/lib/sheet-storage";
import { getProjectShareUrl } from "@/lib/project-storage";
import { cn } from "@/lib/utils";

interface SheetManagerMenuProps {
  sheetUrls: string[];
  projectSheetUrls?: string[];
  projectId?: string | null;
  sheetLabels?: Record<string, string>;
  mergeMode: boolean;
  joinMode?: boolean;
  loading?: boolean;
  onSwitchSheet: (url: string) => void;
  onAddSheet: (url: string) => void;
  onRemoveSheet: (url: string) => void;
  onToggleMerge: (enabled: boolean) => void;
  onReload: () => void;
  onOpenSettings: () => void;
  className?: string;
}

const PANEL_WIDTH = 360;

function displayLabel(url: string, labels?: Record<string, string>): string {
  return labels?.[url] ?? deriveSheetLabel(url);
}

export function SheetManagerMenu({
  sheetUrls,
  projectSheetUrls = [],
  projectId,
  sheetLabels,
  mergeMode,
  joinMode,
  loading,
  onSwitchSheet,
  onAddSheet,
  onRemoveSheet,
  onToggleMerge,
  onReload,
  onOpenSettings,
  className,
}: SheetManagerMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"switch" | "merge">("switch");
  const [sheetInput, setSheetInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const primaryUrl = sheetUrls[0] ?? "";
  const isMulti = sheetUrls.length > 1;
  const projectSheets = projectSheetUrls.length > 0 ? projectSheetUrls : sheetUrls;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open && isMulti) setTab("merge");
  }, [open, isMulti]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.right - PANEL_WIDTH;
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
    setPosition({ top: rect.bottom + 8, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || containerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCopyShare = async () => {
    const shareUrl = projectId ? getProjectShareUrl(projectId) : "";
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const panel = open && mounted && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Kelola Google Sheet"
      className="layer-dropdown animate-fade-in fixed overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
      style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Google Sheet</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {isMulti
            ? joinMode
              ? `${sheetUrls.length} sheet · mode relasional (join)`
              : `${sheetUrls.length} sheet · digabung (union)`
            : "1 sheet aktif"}
        </p>
      </div>

      <div className="flex border-b border-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("switch")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium",
            tab === "switch" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Ganti Sheet
        </button>
        <button
          type="button"
          onClick={() => setTab("merge")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium",
            tab === "merge" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Gabungkan
        </button>
      </div>

      {tab === "switch" && (
        <div className="max-h-[min(420px,70vh)] overflow-y-auto p-3">
          {primaryUrl && (
            <div className="mb-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                Sedang dibuka
              </p>
              <p className="text-xs font-medium text-slate-900">
                {displayLabel(primaryUrl, sheetLabels)}
              </p>
              <p className="truncate text-[10px] text-slate-500" title={primaryUrl}>
                {truncateUrl(primaryUrl, 44)}
              </p>
              {projectId && (
                <button
                  type="button"
                  onClick={() => void handleCopyShare()}
                  className="btn-ghost mt-1 w-full justify-center py-1.5 text-[11px]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Link project disalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Salin link project
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <p className="mb-2 px-1 text-[10px] font-medium text-slate-500">
            Sheet di project ini — klik untuk ganti
          </p>
          {projectSheets.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">
              Belum ada sheet di project. Tambahkan di tab Atur Project.
            </p>
          ) : (
            <ul className="space-y-1">
              {projectSheets.map((url) => {
                const isActive = !isMulti && primaryUrl === url;
                const inMerge = sheetUrls.includes(url);
                return (
                  <li key={url}>
                    <button
                      type="button"
                      disabled={loading || isActive}
                      onClick={() => {
                        onSwitchSheet(url);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-xl p-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-60",
                        isActive && "bg-indigo-50 ring-1 ring-indigo-200"
                      )}
                    >
                      <p className="truncate text-xs font-medium text-slate-900">
                        {displayLabel(url, sheetLabels)}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{truncateUrl(url, 38)}</p>
                      {inMerge && isMulti && (
                        <p className="mt-0.5 text-[10px] text-indigo-600">Termasuk gabungan aktif</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="btn-ghost mt-3 w-full justify-center text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Atur sumber project
          </button>
        </div>
      )}

      {tab === "merge" && (
        <div className="max-h-[min(420px,70vh)] overflow-y-auto p-3">
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            Gabungkan beberapa sheet menjadi satu tabel. Kolom{" "}
            <code className="rounded bg-slate-100 px-1">_sheet</code> menandai asal baris.
          </p>

          <label className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
            <input
              type="checkbox"
              checked={mergeMode}
              onChange={(e) => onToggleMerge(e.target.checked)}
              disabled={sheetUrls.length < 2}
              className="mt-0.5 rounded accent-indigo-600"
            />
            <span className="text-xs text-slate-700">
              Mode gabung (union) — gabungkan semua baris
              {sheetUrls.length < 2 && (
                <span className="block text-[10px] text-slate-400">Tambah minimal 2 sheet</span>
              )}
            </span>
          </label>

          <p className="mb-1.5 text-[10px] font-medium text-slate-500">
            Sheet dalam gabungan ({sheetUrls.length})
          </p>
          <ul className="mb-3 space-y-1">
            {sheetUrls.map((url) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {displayLabel(url, sheetLabels)}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">{truncateUrl(url, 32)}</p>
                </div>
                {sheetUrls.length > 1 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onRemoveSheet(url)}
                    className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-700"
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
              placeholder="Paste link sheet…"
              className="input-field min-w-0 flex-1 py-2 text-xs"
            />
            <button
              type="button"
              disabled={loading || !sheetInput.trim()}
              onClick={() => {
                const url = sheetInput.trim();
                if (!url) return;
                onAddSheet(url);
                setSheetInput("");
              }}
              className="btn-primary shrink-0 px-3 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </button>
          </div>

          {isMulti && (
            <button
              type="button"
              disabled={loading}
              onClick={onReload}
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Muat ulang gabungan
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        onClick={() => {
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
          open
            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50"
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        ) : (
          <Sheet className="h-3.5 w-3.5 text-indigo-500" />
        )}
        <span className="hidden sm:inline">{isMulti ? "Gabungan Sheet" : "Ganti Sheet"}</span>
        <span className="sm:hidden">Sheet</span>
        {isMulti && (
          <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {sheetUrls.length}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {mounted && panel && createPortal(panel, document.body)}
    </div>
  );
}
