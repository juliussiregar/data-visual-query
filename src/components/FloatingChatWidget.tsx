"use client";

import { useState, type CSSProperties } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import type { SheetData, ViewId, DashboardLayout, DataScope, DashboardAction, WidgetProposal, WidgetProposalConfirmResult, WidgetProposalsConfirmResult } from "@/lib/types";
import type { TableRelation } from "@/lib/sql-query-types";
import type { DerivedField } from "@/lib/derived-fields";
import type { UserRole } from "@/lib/auth";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";
import {
  type ChatPanelSize,
  cycleChatPanelSize,
  loadChatPanelSize,
  saveChatPanelSize,
} from "@/lib/chat-size-storage";

interface FloatingChatWidgetProps {
  userId: string;
  data: SheetData;
  activeView: ViewId;
  filters: Record<string, string>;
  dataScope: DataScope | null;
  totalRowCount: number;
  userRole: UserRole;
  layout: DashboardLayout;
  sheetUrls: string[];
  dbDatasets: Record<string, SheetData> | null;
  activeDbTables: string[];
  tableRelations?: TableRelation[];
  derivedFields?: DerivedField[];
  onApplyActions: (actions: DashboardAction[]) => void;
  onConfirmWidgetProposal: (proposal: WidgetProposal) => WidgetProposalConfirmResult;
  onConfirmWidgetProposals: (proposals: WidgetProposal[]) => WidgetProposalsConfirmResult;
  onUndoWidgetLayout: (snapshot: DashboardLayout) => void;
  onWidgetProposalReceived?: () => void;
}

function panelShellClass(size: ChatPanelSize, open: boolean): string {
  if (!open) {
    return "pointer-events-none h-0 w-0 border-0 opacity-0";
  }
  const base =
    "chat-pop-in pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-300 shadow-2xl shadow-indigo-500/20 transition-all duration-300 ease-out layer-chat fixed";

  switch (size) {
    case "fullscreen":
      return cn(
        base,
        "inset-3 z-[120] opacity-100 sm:inset-4 sm:left-auto sm:w-[min(960px,calc(100vw-2rem))]"
      );
    case "large":
      return cn(
        base,
        "right-4 bottom-[5.5rem] z-[110] w-[min(720px,calc(100vw-1.5rem))] opacity-100 sm:right-6 sm:bottom-24"
      );
    default:
      return cn(
        base,
        "right-4 bottom-[5.5rem] z-[110] w-[min(480px,calc(100vw-1.5rem))] opacity-100 sm:right-6 sm:bottom-24"
      );
  }
}

function panelHeightStyle(size: ChatPanelSize, open: boolean): CSSProperties | undefined {
  if (!open) return undefined;
  switch (size) {
    case "fullscreen":
      return { height: "auto", top: "0.75rem", bottom: "0.75rem" };
    case "large":
      return { height: "min(85vh, 900px)" };
    default:
      return { height: "min(680px, calc(100vh - 5.5rem))" };
  }
}

export function FloatingChatWidget({
  userId,
  data,
  activeView,
  filters,
  dataScope,
  totalRowCount,
  userRole,
  layout,
  sheetUrls,
  dbDatasets,
  activeDbTables,
  tableRelations,
  derivedFields,
  onApplyActions,
  onConfirmWidgetProposal,
  onConfirmWidgetProposals,
  onUndoWidgetLayout,
  onWidgetProposalReceived,
}: FloatingChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [chatSize, setChatSize] = useState<ChatPanelSize>(() => loadChatPanelSize());

  const handleCycleSize = () => {
    setChatSize((prev) => {
      const next = cycleChatPanelSize(prev);
      saveChatPanelSize(next);
      return next;
    });
  };

  return (
    <>
      {open && (
        <div
          className={cn(
            "layer-chat fixed inset-0 cursor-pointer bg-black/40 backdrop-blur-[2px]",
            chatSize === "fullscreen" ? "z-[115]" : "z-[105] sm:bg-black/25"
          )}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={panelShellClass(chatSize, open)}
        style={panelHeightStyle(chatSize, open)}
        role="dialog"
        aria-label="AI Chat"
        aria-hidden={!open}
      >
        {open && (
          <ChatPanel
            userId={userId}
            data={data}
            activeView={activeView}
            filters={filters}
            dataScope={dataScope}
            totalRowCount={totalRowCount}
            userRole={userRole}
            layout={layout}
            sheetUrls={sheetUrls}
            dbDatasets={dbDatasets}
            activeDbTables={activeDbTables}
            tableRelations={tableRelations}
            derivedFields={derivedFields}
            onApplyActions={onApplyActions}
            onConfirmWidgetProposal={onConfirmWidgetProposal}
            onConfirmWidgetProposals={onConfirmWidgetProposals}
            onUndoWidgetLayout={onUndoWidgetLayout}
            onWidgetProposalReceived={onWidgetProposalReceived}
            chatSize={chatSize}
            onCycleChatSize={handleCycleSize}
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
          "layer-chat group fixed bottom-6 right-6 z-[110] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
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
