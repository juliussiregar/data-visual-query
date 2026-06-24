"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  AlertCircle,
  X,
  LayoutDashboard,
  Wand2,
  Zap,
  History,
  Trash2,
} from "lucide-react";
import type { ChatMessage, SheetData, ViewId, DashboardLayout, DataScope } from "@/lib/types";
import type { DashboardAction, DashboardContext } from "@/lib/types";
import { describeAction } from "@/lib/chat-actions";
import { buildDataSummaryForChat } from "@/lib/ai-guardrails";
import { rolePermissions, type UserRole } from "@/lib/auth";
import { getFilterableColumns } from "@/lib/filters";
import { widgetLabel } from "@/lib/layout";
import {
  CHAT_HISTORY_LIMIT,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chat-storage";
import { ChatMarkdown } from "./ChatMarkdown";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  {
    icon: LayoutDashboard,
    text: "Tampilkan halaman grafik",
    color: "hover:border-violet-500/40 hover:bg-violet-500/10",
  },
  {
    icon: Zap,
    text: "Filter hanya berkas status Akad",
    color: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
  },
  {
    icon: Sparkles,
    text: "Buka overview dan ringkas data utama",
    color: "hover:border-cyan-500/40 hover:bg-cyan-500/10",
  },
  {
    icon: Wand2,
    text: "Tampilkan tabel data nasabah prioritas YA",
    color: "hover:border-amber-500/40 hover:bg-amber-500/10",
  },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-indigo-400/80 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

interface ChatPanelProps {
  data: SheetData;
  activeView: ViewId;
  filters: Record<string, string>;
  dataScope: DataScope | null;
  totalRowCount: number;
  userRole: UserRole;
  layout: DashboardLayout;
  sheetUrls: string[];
  onApplyActions: (actions: DashboardAction[]) => void;
  onClose?: () => void;
}

export function ChatPanel({
  data,
  activeView,
  filters,
  dataScope,
  totalRowCount,
  userRole,
  layout,
  sheetUrls,
  onApplyActions,
  onClose,
}: ChatPanelProps) {
  const sheetKey = sheetUrls.length ? sheetUrls.join("||") : data.sourceUrl;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatHistory(sheetUrls.length ? sheetUrls : [data.sourceUrl])
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasHistory = messages.length > 0;

  const perms = rolePermissions(userRole);
  const dataSummary = buildDataSummaryForChat(data, {
    maskPII: perms.maskPII,
  });

  const dashboardContext: DashboardContext = useMemo(() => {
    const filterable = getFilterableColumns(data);
    return {
      activeView,
      filters,
      dataScope,
      totalRowCount,
      userRole,
      views: ["overview", "charts", "data", "projects", "sources", "query"],
      filterableColumns: filterable.map((col) => ({
        key: col.key,
        label: col.label,
        values: [
          ...new Set(data.rows.map((r) => r[col.key]?.trim()).filter(Boolean) as string[]),
        ].sort(),
      })),
      chartTitles: data.charts.map((c) => `${c.title} (id: ${c.id})`),
      layoutWidgets: layout.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        visible: w.visible,
        title: widgetLabel(w, data),
      })),
      sheetUrls,
      mergeMode: layout.mergeMode,
      editMode: false,
    };
  }, [data, activeView, filters, dataScope, totalRowCount, userRole, layout, sheetUrls]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const urls = sheetUrls.length ? sheetUrls : [data.sourceUrl];
    setMessages(loadChatHistory(urls));
  }, [sheetKey, data.sourceUrl, sheetUrls]);

  useEffect(() => {
    const urls = sheetUrls.length ? sheetUrls : [data.sourceUrl];
    if (messages.length > 0 && !loading) {
      saveChatHistory(urls, messages);
    }
  }, [messages, loading, sheetUrls, data.sourceUrl]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, dataSummary, dashboardContext }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal mendapatkan respons");

        const actions = (json.actions ?? []) as DashboardAction[];
        if (actions.length > 0) {
          onApplyActions(actions);
        }

        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: json.reply,
            actions: actions.length > 0 ? actions : undefined,
            guardrail: json.guardrail,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, dataSummary, dashboardContext, onApplyActions]
  );

  const handleClearHistory = () => {
    const urls = sheetUrls.length ? sheetUrls : [data.sourceUrl];
    clearChatHistory(urls);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden border-b border-slate-200 px-4 py-3.5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-cyan-600/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">SheetVision AI</h3>
              <p className="text-[10px] text-emerald-600">Online · Bisa atur dashboard</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup chat"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {hasHistory && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <History className="h-3 w-3" />
              <span>
                {messages.length} pesan terakhir · maks. {CHAT_HISTORY_LIMIT}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              <Trash2 className="h-3 w-3" />
              Hapus
            </button>
          </div>
        )}

        {!hasHistory && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-600">Asisten Dashboard</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Saya bisa menganalisis data <strong className="text-slate-600">dan</strong> mengatur
                tampilan — ganti halaman, filter data, buka grafik atau insights. Coba perintah di
                bawah!
              </p>
            </div>
            <div className="grid gap-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.text}
                  type="button"
                  onClick={() => sendMessage(item.text)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50/50",
                    item.color
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasHistory && (
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.slice(0, 2).map((item) => (
              <button
                key={item.text}
                type="button"
                onClick={() => sendMessage(item.text)}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-[10px] text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-50",
                  item.color
                )}
              >
                <item.icon className="h-3 w-3 shrink-0" />
                <span className="line-clamp-2">{item.text}</span>
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            <div
              className={cn(
                "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1",
                msg.role === "user"
                  ? "bg-indigo-100 ring-indigo-500/30"
                  : "bg-violet-500/15 ring-violet-500/25"
              )}
            >
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5 text-indigo-600" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-violet-600" />
              )}
            </div>

            <div
              className={cn(
                "max-w-[88%] space-y-2",
                msg.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 shadow-sm",
                  msg.role === "user"
                    ? "rounded-tr-md bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
                    : "rounded-tl-md border border-slate-200 bg-slate-50 text-slate-800"
                )}
              >
                {msg.role === "assistant" ? (
                  <ChatMarkdown content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>

              {msg.guardrail &&
                (msg.guardrail.sources.length > 0 || msg.guardrail.assumptions.length > 0) && (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">
                    {msg.guardrail.sources.length > 0 && (
                      <p>
                        <span className="font-semibold text-slate-600">Sumber:</span>{" "}
                        {msg.guardrail.sources.join(", ")}
                      </p>
                    )}
                    {msg.guardrail.assumptions.length > 0 && (
                      <p className="mt-1">
                        <span className="font-semibold text-slate-600">Asumsi:</span>{" "}
                        {msg.guardrail.assumptions.join(" · ")}
                      </p>
                    )}
                    {(msg.guardrail.confidence === "low" ||
                      msg.guardrail.confidence === "insufficient") && (
                      <p className="mt-1 font-medium text-amber-600">
                        Keyakinan rendah — verifikasi manual disarankan.
                      </p>
                    )}
                  </div>
                )}

              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.actions.map((action, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700"
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {describeAction(action, data.columns)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-500/25">
              <Bot className="h-3.5 w-3.5 text-violet-300" />
            </div>
            <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-2">
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="shrink-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya data atau minta ubah tampilan..."
            disabled={loading}
            className="flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-600">
          Contoh: &quot;Buka grafik&quot; · &quot;Filter status SP3K&quot; · &quot;Reset filter&quot;
        </p>
      </form>
    </div>
  );
}
