"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Copy,
  Check,
  Trash2,
  Link2,
  Pencil,
} from "lucide-react";
import type { SavedSheet } from "@/lib/sheet-storage";
import {
  getSavedSheets,
  saveSheet,
  removeSavedSheet,
  getShareableUrl,
  truncateUrl,
} from "@/lib/sheet-storage";
import { cn } from "@/lib/utils";

interface SavedSheetsMenuProps {
  currentUrl?: string;
  onSelect: (url: string) => void;
  onChangeLink: () => void;
  className?: string;
}

const DROPDOWN_WIDTH = 320;

export function SavedSheetsMenu({
  currentUrl,
  onSelect,
  onChangeLink,
  className,
}: SavedSheetsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState<SavedSheet[]>([]);
  const [copied, setCopied] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = () => setSaved(getSavedSheets());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [currentUrl, open]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.right - DROPDOWN_WIDTH;
    left = Math.max(8, Math.min(left, window.innerWidth - DROPDOWN_WIDTH - 8));
    const top = rect.bottom + 8;
    setPosition({ top, left });
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
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        containerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setShowSaveForm(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setShowSaveForm(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrentSaved = currentUrl
    ? saved.some((s) => s.url === currentUrl)
    : false;

  const handleSave = () => {
    if (!currentUrl) return;
    saveSheet(currentUrl, saveLabel);
    setSaveLabel("");
    setShowSaveForm(false);
    refresh();
  };

  const handleCopyShare = async () => {
    if (!currentUrl) return;
    const shareUrl = getShareableUrl(currentUrl);
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dropdownPanel = open && mounted && (
    <div
      ref={dropdownRef}
      role="menu"
      className="layer-dropdown animate-fade-in fixed overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/60 ring-1 ring-white/10"
      style={{
        top: position.top,
        left: position.left,
        width: DROPDOWN_WIDTH,
      }}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Link Tersimpan</p>
        <p className="text-[10px] text-slate-500">Disimpan di browser ini (tanpa database)</p>
      </div>

      {currentUrl && (
        <div className="space-y-2 border-b border-white/10 p-3">
          {!showSaveForm ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaveForm(true)}
                disabled={isCurrentSaved}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-50"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                {isCurrentSaved ? "Sudah Tersimpan" : "Simpan Link Aktif"}
              </button>
              <button
                type="button"
                onClick={handleCopyShare}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                title="Salin link share"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Nama (opsional)..."
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveForm(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
          <p className="truncate text-[10px] text-slate-600" title={currentUrl}>
            Aktif: {truncateUrl(currentUrl, 42)}
          </p>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto p-2">
        {saved.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            Belum ada link tersimpan.
            <br />
            Muat sheet lalu klik &quot;Simpan Link Aktif&quot;.
          </p>
        ) : (
          saved.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-white/5",
                currentUrl === item.url && "bg-indigo-500/10"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(item.url);
                  setOpen(false);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-xs font-medium text-white">{item.label}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {truncateUrl(item.url, 36)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeSavedSheet(item.id);
                  refresh();
                }}
                className="shrink-0 rounded-lg p-1.5 text-slate-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                aria-label="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-2">
        <p className="flex items-center gap-1 text-[10px] text-slate-600">
          <Link2 className="h-3 w-3" />
          Buka di perangkat lain: salin link share (↑)
        </p>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!open) updatePosition();
            setOpen(!open);
          }}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            open
              ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-200"
              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          )}
        >
          <Bookmark className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Link Tersimpan</span>
          <span className="sm:hidden">Saved</span>
          {saved.length > 0 && (
            <span className="rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-200">
              {saved.length}
            </span>
          )}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>

        <button
          type="button"
          onClick={onChangeLink}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ganti Link</span>
        </button>
      </div>

      {mounted && dropdownPanel && createPortal(dropdownPanel, document.body)}
    </div>
  );
}
