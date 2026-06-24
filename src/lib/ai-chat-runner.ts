import OpenAI from "openai";
import type { ChatMessage, DashboardAction, SuggestedFollowUp } from "./types";
import type { AiQueryDataset, AiQueryFact } from "./types";
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
import { parseWidgetProposal } from "./widget-proposal";

const MAX_TOOL_ROUNDS = 12;

export interface ChatRunContext {
  dashboardContextBlock: string;
}

export interface ChatRunResult {
  reply: string;
  actions: DashboardAction[];
  widgetProposal: ReturnType<typeof parseWidgetProposal>;
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
    .slice(0, 5);
}

function parseFinalChatResponse(raw: string): Omit<ChatRunResult, "queryFacts"> {
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      actions?: DashboardAction[];
      widgetProposal?: unknown;
      suggestedFollowUps?: unknown;
      assumptions?: string[];
      sources?: string[];
      confidence?: string;
    };
    return {
      reply: parsed.reply ?? raw,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      widgetProposal: parseWidgetProposal(parsed.widgetProposal),
      guardrail: parseGuardrailResponse(parsed),
      suggestedFollowUps: parseSuggestedFollowUps(parsed.suggestedFollowUps),
    };
  } catch {
    return {
      reply: raw,
      actions: [],
      widgetProposal: null,
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
  const analyticsPack = buildAnalyticsPack(dataset);
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
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const completion = await openai.chat.completions.create({
      model,
      messages: chatMessages,
      tools: AI_QUERY_TOOL_DEFINITIONS,
      tool_choice: rounds === 1 ? "auto" : "auto",
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

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const { result, fact } = executeAiQueryTool(dataset, call.function.name, call.function.arguments);
      queryFacts.push(fact);
      chatMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result, null, 2),
      });
    }
  }

  chatMessages.push({ role: "user", content: AI_FINAL_JSON_INSTRUCTION });

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
