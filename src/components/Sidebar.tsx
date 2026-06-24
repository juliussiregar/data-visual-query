import type { ViewId } from "@/lib/types";
import type { UserRole } from "@/lib/auth";
import {
  LayoutDashboard,
  BarChart3,
  Lightbulb,
  Table2,
  Columns3,
  Sheet,
  Database,
  Terminal,
} from "lucide-react";
import { rolePermissions } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Ringkasan utama" },
  { id: "charts", label: "Grafik", icon: BarChart3, desc: "Semua visualisasi" },
  { id: "insights", label: "Insights", icon: Lightbulb, desc: "Analisis otomatis" },
  { id: "data", label: "Data", icon: Table2, desc: "Tabel lengkap" },
  { id: "columns", label: "Kolom", icon: Columns3, desc: "Profil kolom" },
  { id: "sources", label: "Sumber", icon: Database, desc: "Mock DB connector" },
  { id: "sql", label: "SQL", icon: Terminal, desc: "Query read-only" },
];

function navItemsForRole(role: UserRole) {
  const perms = rolePermissions(role);
  return NAV_ITEMS.filter((item) => {
    if (item.id === "sql") return perms.canQuerySQL;
    return true;
  });
}

interface SidebarProps {
  active: ViewId;
  onChange: (view: ViewId) => void;
  rowCount: number;
  scopeLabel?: string | null;
  role?: UserRole;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  active,
  onChange,
  rowCount,
  scopeLabel: scope,
  role = "analyst",
  footer,
  className,
}: SidebarProps) {
  const items = navItemsForRole(role);
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200/80 bg-white",
        className
      )}
    >
      <div className="border-b border-slate-200/80 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
            <Sheet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">SheetVision</p>
            <p className="text-[11px] text-slate-500">{rowCount.toLocaleString("id-ID")} baris</p>
            {scope && (
              <p className="mt-0.5 truncate text-[10px] font-medium text-violet-600" title={scope}>
                {scope}
              </p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{item.label}</p>
                <p className="mt-1 truncate text-[10px] text-slate-400">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>
      {footer && <div className="border-t border-slate-200/80 p-3">{footer}</div>}
    </aside>
  );
}

export { NAV_ITEMS, navItemsForRole };
