"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  dbTableOptionsFromNames,
  filterDbTableOptions,
  type DbTableSelectOption,
} from "@/lib/db-table-filter";
import { cn } from "@/lib/utils";

export interface DbTableSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export function DbTableSearchBar({
  value,
  onChange,
  placeholder = "Cari tabel…",
  className,
  inputClassName,
  autoFocus,
}: DbTableSearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-10 pr-8 text-xs leading-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15",
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Hapus pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface DbTableSelectProps {
  value: string;
  onChange: (value: string) => void;
  tables?: string[];
  options?: DbTableSelectOption[];
  formatLabel?: (value: string) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Called after a table is picked (e.g. close parent menu). */
  onPicked?: () => void;
}

const SIZE_STYLES = {
  xs: {
    trigger:
      "min-w-[12rem] max-w-[20rem] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700",
    panel: "text-xs",
    item: "px-2.5 py-2",
  },
  sm: {
    trigger:
      "w-full min-w-[14rem] max-w-md rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700",
    panel: "text-xs",
    item: "px-2.5 py-2",
  },
  md: {
    trigger: "input-field w-full text-sm",
    panel: "text-sm",
    item: "px-3 py-2",
  },
} as const;

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_HEIGHT = 320;

export function DbTableSelect({
  value,
  onChange,
  tables = [],
  options,
  formatLabel = (v) => v,
  placeholder = "Pilih tabel…",
  searchPlaceholder = "Cari tabel…",
  size = "sm",
  className,
  disabled,
  ariaLabel = "Pilih tabel",
  onPicked,
}: DbTableSelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: PANEL_MIN_WIDTH,
  });

  const resolvedOptions = useMemo(
    () => options ?? dbTableOptionsFromNames(tables, formatLabel),
    [options, tables, formatLabel]
  );

  const filteredOptions = useMemo(
    () => filterDbTableOptions(resolvedOptions, query),
    [resolvedOptions, query]
  );

  const selected = resolvedOptions.find((option) => option.value === value);
  const styles = SIZE_STYLES[size];

  useEffect(() => setMounted(true), []);

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, PANEL_MIN_WIDTH);
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPanelStyle({
      top: rect.bottom + 6,
      left,
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const pick = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
    onPicked?.();
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  if (resolvedOptions.length === 0) {
    return (
      <span className={cn("text-xs text-slate-400", className)}>Tidak ada tabel</span>
    );
  }

  if (resolvedOptions.length === 1) {
    return (
      <span
        className={cn(styles.trigger, "inline-flex truncate", className)}
        title={selected?.label}
      >
        {selected?.label ?? resolvedOptions[0].label}
      </span>
    );
  }

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: panelStyle.top,
          left: panelStyle.left,
          width: panelStyle.width,
          zIndex: 9999,
        }}
        className={cn(
          "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl",
          styles.panel
        )}
      >
        <div className="border-b border-slate-100 p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-[10px] border border-slate-200 bg-white py-2 pl-10 pr-8 text-xs leading-normal text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="overflow-y-auto overscroll-contain p-1"
          style={{ maxHeight: PANEL_MAX_HEIGHT }}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-6 text-center text-slate-400">
              Tidak ada tabel cocok dengan &ldquo;{query}&rdquo;
            </li>
          ) : (
            filteredOptions.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => pick(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg text-left transition-colors",
                      styles.item,
                      active
                        ? "bg-indigo-50 font-medium text-indigo-900"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-indigo-600 opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "inline-flex items-center justify-between gap-2 text-left transition-colors hover:border-indigo-200 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50",
          styles.trigger,
          className
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
