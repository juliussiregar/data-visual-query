"use client";

import { useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import type { SheetData, ViewId, DashboardLayout, DataScope } from "@/lib/types";
import type { UserRole } from "@/lib/auth";
import type { DashboardAction } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";

interface FloatingChatWidgetProps {
  data: SheetData;
  activeView: ViewId;
  filters: Record<string, string>;
  dataScope: DataScope | null;
  totalRowCount: number;
  userRole: UserRole;
  certifiedMetricsOnly: boolean;
  layout: DashboardLayout;
  sheetUrls: string[];
  onApplyActions: (actions: DashboardAction[]) => void;
}

export function FloatingChatWidget({
  data,
  activeView,
  filters,
  dataScope,
  totalRowCount,
  userRole,
  certifiedMetricsOnly,
  layout,
  sheetUrls,
  onApplyActions,
}: FloatingChatWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="layer-chat fixed inset-0 bg-black/40 backdrop-blur-[2px] sm:bg-black/25"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "layer-chat fixed flex flex-col overflow-hidden rounded-2xl border border-slate-300 shadow-2xl shadow-indigo-500/20 transition-all duration-300 ease-out",
          "right-4 bottom-[5.5rem] sm:right-6 sm:bottom-24",
          open
            ? "chat-pop-in pointer-events-auto w-[calc(100vw-1.5rem)] opacity-100 sm:w-[420px]"
            : "pointer-events-none h-0 w-0 border-0 opacity-0"
        )}
        style={open ? { height: "min(580px, calc(100vh - 7rem))" } : undefined}
        role="dialog"
        aria-label="AI Chat"
        aria-hidden={!open}
      >
        {open && (
          <ChatPanel
            data={data}
            activeView={activeView}
            filters={filters}
            dataScope={dataScope}
            totalRowCount={totalRowCount}
            userRole={userRole}
            certifiedMetricsOnly={certifiedMetricsOnly}
            layout={layout}
            sheetUrls={sheetUrls}
            onApplyActions={onApplyActions}
            onClose={() => setOpen(false)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup chat AI" : "Buka chat AI"}
        aria-expanded={open}
        className={cn(
          "layer-chat group fixed bottom-6 right-6 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
          open
            ? "bg-white text-slate-700 shadow-xl ring-2 ring-slate-200 hover:bg-slate-50"
            : "bg-gradient-to-br from-indigo-500 via-violet-500 to-violet-600 text-white shadow-xl shadow-indigo-500/40 hover:shadow-indigo-500/60"
        )}
      >
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/30" />
        )}
        {open ? (
          <X className="relative h-6 w-6" />
        ) : (
          <>
            <Bot className="relative h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
          </>
        )}
      </button>
    </>
  );
}
