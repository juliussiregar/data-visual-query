import OpenAI from "openai";
import type {
  AiQueryDataset,
  AiQueryFact,
  ChatMessage,
  DashboardAction,
  SuggestedFollowUp,
  WidgetProposal,
} from "./types";
import { CHAT_HISTORY_LIMIT } from "./chat-storage";
import { buildAnalyticsPack } from "./ai-analytics-pack";
import {
  AI_QUERY_TOOL_DEFINITIONS,
  executeAiQueryTool,
} from "./ai-query-tools";
import {
  AI_FINAL_JSON_INSTRUCTION,
  buildChatSystemPrompt,
} from "./ai-chat-prompt";
import { parseGuardrailResponse } from "./ai-guardrails";
import { parseWidgetProposals } from "./widget-proposal";

const MAX_TOOL_ROUNDS = 12;

export interface ChatRunContext {
  dashboardContextBlock: string;
  /** Diset saat user mengklik chip aksi (mis. follow-up kind "widget"). */
  intent?: "create_widget";
  /** Izinkan tool membaca kolom sensitif (PII) — ditentukan dari izin role user. */
  allowSensitive?: boolean;
}

const FORCE_WIDGET_INSTRUCTION = `PENTING — KONTEKS AKSI: User baru saja MENGKLIK tombol untuk membuat/mengubah widget. Ini PERSETUJUAN EKSPLISIT, bukan pertanyaan.
WAJIB pada respons FINAL ini:
- Isi "widgetProposals" dengan minimal satu proposal valid (operation "create" atau "update") sesuai permintaan user. Jika user minta beberapa widget, isi beberapa item.
- Isi visualShape, title, groupByKey/measureKey/aggregation, dan validationQuestion + summary.
- Jika permintaan/analisis ber-scope (mis. "di Jawa Barat", "status Akad"), WAJIB isi "conditions" yang sama — jangan beri judul ber-scope tapi data tanpa filter.
- DILARANG hanya menawarkan ulang atau bertanya konfirmasi ("Mau saya siapkan…?"). Langsung buat proposalnya.`;

export interface ChatRunResult {
  reply: string;
  actions: DashboardAction[];
  widgetProposals: WidgetProposal[];
  guardrail: ReturnType<typeof parseGuardrailResponse>;
  suggestedFollowUps: SuggestedFollowUp[];
  queryFacts: AiQueryFact[];
}

function parseSuggestedFollowUps(raw: unknown): SuggestedFollowUp[] {
  if (!Array.isArray(raw)) return [];
  const kinds = new Set(["analyze", "widget", "filter", "navigate", "help"]);
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const kindRaw = String(item.kind ?? "");
      const kind = kinds.has(kindRaw)
        ? (kindRaw as SuggestedFollowUp["kind"])
        : undefined;
      return {
        label: String(item.label ?? "").trim(),
        message: String(item.message ?? item.label ?? "").trim(),
        kind,
      };
    })
    .filter((f) => f.label && f.message)
    .slice(0, 4);
}

function parseFinalChatResponse(raw: string): Omit<ChatRunResult, "queryFacts"> {
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      actions?: DashboardAction[];
      widgetProposal?: unknown;
      widgetProposals?: unknown;
      suggestedFollowUps?: unknown;
      assumptions?: string[];
      sources?: string[];
      confidence?: string;
    };
    // Terima "widgetProposals" (array) maupun "widgetProposal" (tunggal, kompat).
    const widgetProposals = parseWidgetProposals(parsed.widgetProposals ?? parsed.widgetProposal);
    return {
      reply:
        typeof parsed.reply === "string" && parsed.reply.trim()
          ? parsed.reply
          : "Maaf, saya tidak bisa menyusun jawaban. Coba ulangi pertanyaan Anda.",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      widgetProposals,
      guardrail: parseGuardrailResponse(parsed),
      suggestedFollowUps: parseSuggestedFollowUps(parsed.suggestedFollowUps),
    };
  } catch {
    return {
      reply: raw,
      actions: [],
      widgetProposals: [],
      guardrail: { assumptions: [], sources: [], confidence: "medium" },
      suggestedFollowUps: [],
    };
  }
}

export async function runAiChatWithTools(
  openai: OpenAI,
  model: string,
  dataset: AiQueryDataset,
  messages: ChatMessage[],
  ctx: ChatRunContext
): Promise<ChatRunResult> {
  const analyticsPack = buildAnalyticsPack(dataset, ctx.allowSensitive ?? false);
  const systemContent = `${buildChatSystemPrompt()}\n\n--- ANALYTICS PACK ---\n${analyticsPack}${ctx.dashboardContextBlock}`;

  const recentMessages = messages.slice(-CHAT_HISTORY_LIMIT);

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...recentMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const queryFacts: AiQueryFact[] = [];
  // Cache hasil per (nama+argumen) — cegah model mengulang tool call yang sama berkali-kali.
  const toolCache = new Map<string, unknown>();
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const completion = await openai.chat.completions.create({
      model,
      messages: chatMessages,
      tools: AI_QUERY_TOOL_DEFINITIONS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 4096,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls;
    if (!toolCalls?.length) {
      chatMessages.push(choice);
      break;
    }

    chatMessages.push(choice);

    let allDuplicate = true;
    for (const call of toolCalls) {
      // Setiap tool_call_id WAJIB dibalas dengan tool message, kalau tidak
      // request berikutnya ke OpenAI akan error 400.
      if (call.type !== "function") {
        allDuplicate = false;
        chatMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: `Tipe tool call tidak didukung: ${call.type}` }),
        });
        continue;
      }

      const signature = `${call.function.name}:${call.function.arguments}`;
      let result: unknown;
      if (toolCache.has(signature)) {
        // Panggilan identik sudah dieksekusi — pakai hasil cache, jangan duplikat fact.
        result = toolCache.get(signature);
      } else {
        allDuplicate = false;
        const exec = executeAiQueryTool(
          dataset,
          call.function.name,
          call.function.arguments,
          ctx.allowSensitive ?? false
        );
        result = exec.result;
        toolCache.set(signature, result);
        queryFacts.push(exec.fact);
      }
      chatMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result, null, 2),
      });
    }

    // Model hanya mengulang tool call yang sama → hentikan loop, lanjut ke jawaban final.
    if (allDuplicate) break;
  }

  const finalInstruction =
    ctx.intent === "create_widget"
      ? `${AI_FINAL_JSON_INSTRUCTION}\n\n${FORCE_WIDGET_INSTRUCTION}`
      : AI_FINAL_JSON_INSTRUCTION;
  chatMessages.push({ role: "user", content: finalInstruction });

  const finalCompletion = await openai.chat.completions.create({
    model,
    messages: chatMessages,
    temperature: 0.25,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw =
    finalCompletion.choices[0]?.message?.content ??
    '{"reply":"Maaf, tidak ada respons.","actions":[],"widgetProposal":null,"suggestedFollowUps":[],"assumptions":[],"sources":[],"confidence":"medium"}';

  const parsed = parseFinalChatResponse(raw);

  return {
    ...parsed,
    queryFacts,
  };
}
