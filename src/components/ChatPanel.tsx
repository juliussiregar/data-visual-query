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
  Eye,
  Check,
  Undo2,
  Maximize2,
} from "lucide-react";
import type { ChatMessage, SheetData, ViewId, DashboardLayout, DataScope, WidgetProposal, WidgetProposalConfirmResult, WidgetProposalsConfirmResult, AiQueryDataset, SuggestedFollowUp, DashboardAction, DashboardContext } from "@/lib/types";
import { describeAction } from "@/lib/chat-actions";
import type { UserRole } from "@/lib/auth";
import { getFilterableColumns } from "@/lib/filters";
import { widgetLabel } from "@/lib/layout";
import {
  CHAT_HISTORY_LIMIT,
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chat-storage";
import { describeWidgetProposal } from "@/lib/widget-proposal";
import { ChatWidgetPreviewModal } from "./ChatWidgetPreviewModal";
import { ChatMarkdown } from "./ChatMarkdown";
import { cn } from "@/lib/utils";
import { type ChatPanelSize, chatPanelSizeLabel } from "@/lib/chat-size-storage";

const QUICK_PROMPTS = [
  {
    icon: Wand2,
    text: "Widget apa yang cocok untuk data saya?",
    color: "hover:border-violet-500/40 hover:bg-violet-500/10",
  },
  {
    icon: Sparkles,
    text: "Buatkan widget donut distribusi status",
    color: "hover:border-amber-500/40 hover:bg-amber-500/10",
  },
  {
    icon: LayoutDashboard,
    text: "Tambah stat card untuk metrik utama",
    color: "hover:border-cyan-500/40 hover:bg-cyan-500/10",
  },
  {
    icon: Zap,
    text: "Filter hanya berkas status Akad",
    color: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
  },
  {
    icon: Wand2,
    text: "Ubah widget batang jadi donut",
    color: "hover:border-amber-500/40 hover:bg-amber-500/10",
  },
  {
    icon: LayoutDashboard,
    text: "Tampilkan halaman grafik",
    color: "hover:border-violet-500/40 hover:bg-violet-500/10",
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
  userId: string;
  data: SheetData;
  activeView: ViewId;
  filters: Record<string, string>;
  dataScope: DataScope | null;
  totalRowCount: number;
  userRole: UserRole;
  layout: DashboardLayout;
  sheetUrls: string[];
  onApplyActions: (actions: DashboardAction[]) => void;
  onConfirmWidgetProposal: (proposal: WidgetProposal) => WidgetProposalConfirmResult;
  onConfirmWidgetProposals: (proposals: WidgetProposal[]) => WidgetProposalsConfirmResult;
  onUndoWidgetLayout: (snapshot: DashboardLayout) => void;
  onWidgetProposalReceived?: () => void;
  chatSize?: ChatPanelSize;
  onCycleChatSize?: () => void;
  onClose?: () => void;
}

const WIDGET_CREATE_VERB = /\b(buat|buatkan|bikin|tambah|tambahkan|terapkan|pasang)\b/i;
const WIDGET_TERMS = /widget|chart|grafik|donut|bar|batang|garis|line|stat|kartu|ranking|tabel|pie|visual/i;
const WIDGET_AGREE_START =
  /^(ya|iya|iyah|iyaa|yup|yoi|ok|oke|oce|boleh|lanjut|setuju|gas|mau|silakan|silahkan)\b/i;

/** Deteksi apakah pesan yang DIKETIK user adalah perintah/persetujuan membuat widget. */
function typedWidgetIntent(text: string, assistantOfferedWidget: boolean): "create_widget" | undefined {
  const t = text.trim();
  if (WIDGET_CREATE_VERB.test(t) && WIDGET_TERMS.test(t)) return "create_widget";
  if (assistantOfferedWidget && WIDGET_AGREE_START.test(t)) return "create_widget";
  return undefined;
}

export function ChatPanel({
  userId,
  data,
  activeView,
  filters,
  dataScope,
  totalRowCount,
  userRole,
  layout,
  sheetUrls,
  onApplyActions,
  onConfirmWidgetProposal,
  onConfirmWidgetProposals,
  onUndoWidgetLayout,
  onWidgetProposalReceived,
  chatSize = "default",
  onCycleChatSize,
  onClose,
}: ChatPanelProps) {
  const sheetKey = sheetUrls.length ? sheetUrls.join("||") : data.sourceUrl;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatHistory(userId, sheetUrls.length ? sheetUrls : [data.sourceUrl])
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewProposal, setPreviewProposal] = useState<WidgetProposal | null>(null);
  const [previewMessageIndex, setPreviewMessageIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const hasHistory = messages.length > 0;

  const queryDataset: AiQueryDataset = useMemo(
    () => ({
      columns: data.columns,
      rows: data.rows,
      totalRowCount,
      sourceUrl: data.sourceUrl,
      kpis: data.kpis,
      insights: data.insights,
      metrics: data.metrics,
      metricValues: data.metricValues,
    }),
    [data, totalRowCount]
  );

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
        visualShape: w.visualShape,
        groupByKey: w.dataQuery?.groupByKey ?? w.categoryKey,
        measureKey: w.dataQuery?.measureKey ?? w.valueKey,
        aggregation: w.dataQuery?.aggregation ?? w.aggregation,
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
    setMessages(loadChatHistory(userId, urls));
  }, [sheetKey, data.sourceUrl, sheetUrls, userId]);

  useEffect(() => {
    const urls = sheetUrls.length ? sheetUrls : [data.sourceUrl];
    if (messages.length > 0 && !loading) {
      saveChatHistory(userId, urls, messages);
    }
  }, [messages, loading, sheetUrls, data.sourceUrl, userId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string, intent?: "create_widget", displayText?: string) => {
      if (!text.trim() || loading) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: text.trim(),
        ...(displayText?.trim() ? { displayContent: displayText.trim() } : {}),
      };
      const newMessages = [...messages, userMessage];
      const recentForApi = newMessages.slice(-CHAT_HISTORY_LIMIT);
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: recentForApi, queryDataset, dashboardContext, intent }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal mendapatkan respons");

        const actions = (json.actions ?? []) as DashboardAction[];
        if (actions.length > 0) {
          onApplyActions(actions);
        }

        const widgetProposals = (
          (json.widgetProposals as WidgetProposal[] | undefined) ??
          (json.widgetProposal ? [json.widgetProposal as WidgetProposal] : [])
        );
        const suggestedFollowUps = (json.suggestedFollowUps ?? []) as SuggestedFollowUp[];
        const queryFacts = json.queryFacts as ChatMessage["queryFacts"];

        if (widgetProposals.length > 0) {
          onWidgetProposalReceived?.();
        }

        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: json.reply,
            actions: actions.length > 0 ? actions : undefined,
            widgetProposal: widgetProposals.length === 1 ? widgetProposals[0] : undefined,
            widgetProposals: widgetProposals.length > 1 ? widgetProposals : undefined,
            proposalStatus: widgetProposals.length > 0 ? "pending" : undefined,
            guardrail: json.guardrail,
            suggestedFollowUps: suggestedFollowUps.length > 0 ? suggestedFollowUps : undefined,
            queryFacts: queryFacts?.length ? queryFacts : undefined,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, queryDataset, dashboardContext, onApplyActions, onWidgetProposalReceived]
  );

  /** Apakah pesan asisten terakhir menawarkan pembuatan widget (chip kind "widget")? */
  const assistantOfferedWidget = useCallback((): boolean => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") {
        return messages[i].suggestedFollowUps?.some((f) => f.kind === "widget") ?? false;
      }
    }
    return false;
  }, [messages]);

  const submitInput = useCallback(() => {
    sendMessage(input, typedWidgetIntent(input, assistantOfferedWidget()));
  }, [input, sendMessage, assistantOfferedWidget]);

  const markProposalStatus = useCallback((index: number, status: "confirmed" | "rejected") => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, proposalStatus: status } : m))
    );
  }, []);

  const handleConfirmProposal = useCallback(
    (proposal: WidgetProposal, messageIndex: number) => {
      setProposalError(null);
      const result = onConfirmWidgetProposal(proposal);
      if (result.ok) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex
              ? {
                  ...m,
                  proposalStatus: "confirmed" as const,
                  layoutSnapshotBefore: result.layoutSnapshot,
                }
              : m
          )
        );
      } else {
        setProposalError("Gagal menerapkan widget. Periksa konfigurasi widget dan coba lagi.");
      }
      return result.ok;
    },
    [onConfirmWidgetProposal]
  );

  // Indeks proposal yang "dibuang" sebelum diterapkan, key: "msgIdx:propIdx".
  const [discardedProposals, setDiscardedProposals] = useState<Set<string>>(new Set());

  const toggleDiscardProposal = useCallback((messageIndex: number, proposalIndex: number) => {
    setDiscardedProposals((prev) => {
      const next = new Set(prev);
      const key = `${messageIndex}:${proposalIndex}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleApplyAllProposals = useCallback(
    (messageIndex: number, proposals: WidgetProposal[]) => {
      setProposalError(null);
      const kept = proposals.filter((_, j) => !discardedProposals.has(`${messageIndex}:${j}`));
      if (kept.length === 0) {
        setProposalError("Semua widget dibuang — tidak ada yang diterapkan.");
        return;
      }
      const result = onConfirmWidgetProposals(kept);
      if (result.ok) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex
              ? { ...m, proposalStatus: "confirmed" as const, layoutSnapshotBefore: result.layoutSnapshot }
              : m
          )
        );
      } else {
        setProposalError(result.errors[0] ?? "Gagal menerapkan widget.");
      }
    },
    [discardedProposals, onConfirmWidgetProposals]
  );

  const handleUndoProposal = useCallback(
    (messageIndex: number) => {
      const msg = messages[messageIndex];
      if (!msg?.layoutSnapshotBefore) return;
      onUndoWidgetLayout(msg.layoutSnapshotBefore);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === messageIndex
            ? { ...m, proposalStatus: "pending" as const, layoutSnapshotBefore: undefined }
            : m
        )
      );
    },
    [messages, onUndoWidgetLayout]
  );

  const handleRejectProposal = useCallback((messageIndex: number) => {
    markProposalStatus(messageIndex, "rejected");
    setInput("Tolong sesuaikan proposal widget-nya: ");
    inputRef.current?.focus();
  }, [markProposalStatus]);

  const handleClearHistory = () => {
    const urls = sheetUrls.length ? sheetUrls : [data.sourceUrl];
    clearChatHistory(userId, urls);
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
              <p className="text-[10px] text-emerald-600">
                Query engine aktif · CRUD widget project · {chatPanelSizeLabel(chatSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onCycleChatSize && (
              <button
                type="button"
                onClick={onCycleChatSize}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                aria-label={chatPanelSizeLabel(chatSize)}
                title={chatPanelSizeLabel(chatSize)}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
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
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.some(
          (m) => (m.widgetProposal || m.widgetProposals?.length) && m.proposalStatus === "pending"
        ) && (
          <div className="rounded-xl border-2 border-violet-400 bg-violet-50 px-3 py-2.5 text-xs text-violet-900 shadow-sm">
            <p className="font-semibold">Widget menunggu konfirmasi</p>
            <p className="mt-0.5 text-violet-700">
              Scroll ke bawah → klik <strong>Lihat preview</strong> lalu{" "}
              <strong>Ya, terapkan</strong> supaya widget muncul di Overview.
            </p>
          </div>
        )}

        {proposalError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {proposalError}
          </div>
        )}

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
                Saya analisis data <strong className="text-slate-600">dan</strong> bantu merancang
                Overview Anda — buat, ubah, atau hapus widget di project ini. Setelah insight, saya
                sering <strong className="text-slate-600">menawarkan ide widget</strong>; klik{" "}
                <strong className="text-slate-600">Ya, terapkan</strong> untuk menambahkannya.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-violet-700">
                Coba: &quot;Widget apa yang cocok?&quot; atau &quot;Buatkan donut status&quot;
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
                  <p className="text-sm leading-relaxed">{msg.displayContent ?? msg.content}</p>
                )}
              </div>

              {msg.queryFacts && msg.queryFacts.length > 0 && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] text-sky-800">
                  <p className="mb-1 font-semibold text-sky-900">Perhitungan terverifikasi:</p>
                  <ul className="space-y-0.5">
                    {msg.queryFacts.map((fact, j) => (
                      <li key={j}>
                        <span className="font-mono text-sky-600">{fact.tool}</span> — {fact.summary}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && msg.role === "assistant" && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestedFollowUps.map((followUp, j) => (
                    <button
                      key={j}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        sendMessage(
                          followUp.message,
                          followUp.kind === "widget" ? "create_widget" : undefined,
                          followUp.label
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-50",
                        followUp.kind === "widget"
                          ? "border-violet-300 bg-violet-50 text-violet-800 hover:border-violet-400 hover:bg-violet-100"
                          : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
                      )}
                    >
                      {followUp.kind === "widget" && <Wand2 className="h-2.5 w-2.5 shrink-0" />}
                      {followUp.label}
                    </button>
                  ))}
                </div>
              )}

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

              {msg.widgetProposal && (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-3 text-xs",
                    msg.proposalStatus === "confirmed"
                      ? "border-emerald-200 bg-emerald-50"
                      : msg.proposalStatus === "rejected"
                        ? "border-slate-200 bg-slate-50 opacity-70"
                        : "border-violet-400 bg-violet-50 ring-2 ring-violet-200/80"
                  )}
                >
                  <p className="font-semibold text-violet-900">
                    {describeWidgetProposal(msg.widgetProposal, data.columns)}
                  </p>
                  <p className="mt-1 text-slate-600">{msg.widgetProposal.summary}</p>
                  {msg.proposalStatus === "pending" && (
                    <>
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 font-medium text-amber-900">
                        {msg.widgetProposal.validationQuestion}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewProposal(msg.widgetProposal!);
                            setPreviewMessageIndex(i);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 font-medium text-violet-700 hover:bg-violet-50"
                        >
                          <Eye className="h-3 w-3" />
                          Lihat preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmProposal(msg.widgetProposal!, i)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-500"
                        >
                          <Check className="h-3 w-3" />
                          Ya, terapkan
                        </button>
                      </div>
                    </>
                  )}
                  {msg.proposalStatus === "confirmed" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="font-medium text-emerald-700">✓ Diterapkan ke dashboard</p>
                      {msg.layoutSnapshotBefore && (
                        <button
                          type="button"
                          onClick={() => handleUndoProposal(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Undo2 className="h-3 w-3" />
                          Batalkan
                        </button>
                      )}
                    </div>
                  )}
                  {msg.proposalStatus === "rejected" && (
                    <p className="mt-2 text-slate-500">Dibatalkan — minta penyesuaian di chat</p>
                  )}
                </div>
              )}

              {msg.widgetProposals && msg.widgetProposals.length > 0 && (
                <div className="space-y-2">
                  {msg.proposalStatus === "pending" && (
                    <p className="text-[11px] font-semibold text-violet-900">
                      {msg.widgetProposals.length} widget diusulkan — buang yang tak perlu, lalu terapkan:
                    </p>
                  )}
                  {msg.widgetProposals.map((wp, j) => {
                    const discarded = discardedProposals.has(`${i}:${j}`);
                    return (
                      <div
                        key={j}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs",
                          msg.proposalStatus === "confirmed"
                            ? "border-emerald-200 bg-emerald-50"
                            : discarded
                              ? "border-slate-200 bg-slate-50 opacity-60"
                              : "border-violet-300 bg-violet-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn("font-semibold text-violet-900", discarded && "line-through")}>
                              {describeWidgetProposal(wp, data.columns)}
                            </p>
                            <p className="mt-0.5 text-slate-600">{wp.summary}</p>
                          </div>
                          {msg.proposalStatus === "pending" && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                title="Lihat preview"
                                onClick={() => {
                                  setPreviewProposal(wp);
                                  setPreviewMessageIndex(i);
                                }}
                                className="rounded-md border border-violet-300 bg-white p-1 text-violet-700 hover:bg-violet-50"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title={discarded ? "Pulihkan" : "Buang"}
                                onClick={() => toggleDiscardProposal(i, j)}
                                className="rounded-md border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50"
                              >
                                {discarded ? <Undo2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {msg.proposalStatus === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleApplyAllProposals(i, msg.widgetProposals!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
                    >
                      <Check className="h-3 w-3" />
                      Terapkan{" "}
                      {msg.widgetProposals.filter((_, j) => !discardedProposals.has(`${i}:${j}`)).length} widget
                    </button>
                  )}
                  {msg.proposalStatus === "confirmed" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-emerald-700">✓ Diterapkan ke dashboard</p>
                      {msg.layoutSnapshotBefore && (
                        <button
                          type="button"
                          onClick={() => handleUndoProposal(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Undo2 className="h-3 w-3" />
                          Batalkan
                        </button>
                      )}
                    </div>
                  )}
                  {msg.proposalStatus === "rejected" && (
                    <p className="text-slate-500">Dibatalkan — minta penyesuaian di chat</p>
                  )}
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
          submitInput();
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
          Contoh: &quot;Buat widget batang per status&quot; · &quot;Cara pakai Explore?&quot; · &quot;Filter status SP3K&quot;
        </p>
      </form>

      {previewProposal && previewMessageIndex !== null && (() => {
        // Preview dari pesan multi-widget → view-only (apply lewat "Terapkan semua").
        const isBatch = (messages[previewMessageIndex]?.widgetProposals?.length ?? 0) > 0;
        return (
          <ChatWidgetPreviewModal
            open
            proposal={previewProposal}
            data={data}
            layout={layout}
            onClose={() => {
              setPreviewProposal(null);
              setPreviewMessageIndex(null);
            }}
            onConfirm={
              isBatch ? undefined : () => handleConfirmProposal(previewProposal, previewMessageIndex)
            }
            onReject={isBatch ? undefined : () => handleRejectProposal(previewMessageIndex)}
          />
        );
      })()}
    </div>
  );
}
