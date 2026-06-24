"use client";

import { LogOut, User } from "lucide-react";
import type { AuthUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/auth";

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:flex"
        title={user.email}
      >
        <User className="h-3.5 w-3.5 text-indigo-500" />
        <span className="max-w-[120px] truncate text-xs font-medium text-slate-700">
          {user.name}
        </span>
        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700">
          {ROLE_LABELS[user.role]}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void onLogout()}
        className="btn-ghost gap-1.5"
        title="Keluar"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Keluar</span>
      </button>
    </div>
  );
}
