"use client";

import type { ViewId } from "@/lib/types";
import type { UserRole } from "@/lib/auth";
import { NAV_SECTIONS, navItemsForRole, type NavItem } from "@/lib/nav-config";
import { Sheet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  active: ViewId;
  onChange: (view: ViewId) => void;
  hasData: boolean;
  rowCount: number;
  scopeLabel?: string | null;
  role?: UserRole;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  active,
  onChange,
  hasData,
  rowCount,
  scopeLabel: scope,
  role,
  footer,
  className,
}: SidebarProps) {
  const sections = navItemsForRole(role);

  const handleNav = (item: NavItem) => {
    if (item.requiresData && !hasData) {
      onChange("overview");
      return;
    }
    onChange(item.id);
  };

  return (
    <aside
      className={cn(
        "app-sidebar flex flex-col border-r border-slate-200/80 bg-white",
        className
      )}
    >
      <nav className="flex-1 overflow-y-auto p-3 pt-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = active === item.id;
                const locked = Boolean(item.requiresData && !hasData);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNav(item)}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-all",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : locked
                            ? "text-slate-400 hover:bg-slate-50"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600" />
                      )}
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? "text-indigo-600"
                            : locked
                              ? "text-slate-300"
                              : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none">{item.label}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                      {locked && <Lock className="h-3 w-3 shrink-0 text-slate-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!hasData && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
            Select a project above. Data loads automatically when a source is configured.
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200/80 px-4 py-3">
        {hasData ? (
          <div className="text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">
              {rowCount.toLocaleString("id-ID")}
            </span>{" "}
            baris
            {scope && (
              <p className="mt-0.5 truncate text-[10px] font-medium text-violet-600" title={scope}>
                {scope}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400">Belum ada data dimuat</p>
        )}
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </aside>
  );
}

export { NAV_SECTIONS, navItemsForRole };
