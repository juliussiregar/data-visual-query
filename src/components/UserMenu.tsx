"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, RotateCcw, Settings, ChevronDown } from "lucide-react";
import type { AuthUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onResetWorkspace?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function UserMenu({ user, onLogout, onOpenSettings, onResetWorkspace }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
          {initials(user.name)}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[90px] truncate text-xs font-medium leading-tight text-slate-800">
            {user.name}
          </p>
          <p className="text-[10px] text-violet-600">{ROLE_LABELS[user.role]}</p>
        </div>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
        >
          <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
            <p className="text-xs font-medium text-slate-800">{user.name}</p>
            <p className="text-[10px] text-slate-500">@{user.username}</p>
          </div>
          {onOpenSettings && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Pengaturan project
            </button>
          )}
          {onResetWorkspace && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onResetWorkspace();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset workspace
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
