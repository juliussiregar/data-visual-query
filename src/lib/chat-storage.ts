import type { ChatMessage } from "./types";
import { userScopedKey } from "./user-local-storage";

export const CHAT_HISTORY_LIMIT = 10;
const CHAT_STORE_SUFFIX = "chat";

function isBrowser() {
  return typeof window !== "undefined";
}

export function chatStorageKey(sheetUrls: string[]): string {
  const normalized = [...new Set(sheetUrls.map((u) => u.trim()).filter(Boolean))].sort();
  return normalized.join("||") || "default";
}

function chatStoreKey(userId: string) {
  return userScopedKey(userId, CHAT_STORE_SUFFIX);
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as ChatMessage;
  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.trim().length > 0
  );
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter(isValidMessage)
    .slice(-CHAT_HISTORY_LIMIT)
    .map(({ role, content, displayContent, actions, widgetProposal, widgetProposals, proposalStatus, guardrail, suggestedFollowUps }) => ({
      role,
      content,
      ...(displayContent ? { displayContent } : {}),
      ...(actions?.length ? { actions } : {}),
      ...(widgetProposals?.length ? { widgetProposals } : {}),
      ...(widgetProposal
        ? { widgetProposal, proposalStatus: proposalStatus === "confirmed" ? "confirmed" : proposalStatus ?? "pending" }
        : {}),
      ...(widgetProposals?.length && !widgetProposal
        ? { proposalStatus: proposalStatus === "confirmed" ? "confirmed" : proposalStatus ?? "pending" }
        : {}),
      ...(guardrail ? { guardrail } : {}),
      ...(suggestedFollowUps?.length ? { suggestedFollowUps } : {}),
    }));
}

export function loadChatHistory(userId: string, sheetUrls: string[]): ChatMessage[] {
  if (!isBrowser() || !userId) return [];
  try {
    const raw = localStorage.getItem(chatStoreKey(userId));
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, unknown>;
    const key = chatStorageKey(sheetUrls);
    const stored = all[key];
    if (!Array.isArray(stored)) return [];
    return trimMessages(stored);
  } catch {
    return [];
  }
}

export function saveChatHistory(userId: string, sheetUrls: string[], messages: ChatMessage[]) {
  if (!isBrowser() || !userId) return;
  try {
    const storeKey = chatStoreKey(userId);
    const raw = localStorage.getItem(storeKey);
    const all: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
    const key = chatStorageKey(sheetUrls);
    const trimmed = trimMessages(messages);
    if (trimmed.length === 0) {
      delete all[key];
    } else {
      all[key] = trimmed;
    }
    localStorage.setItem(storeKey, JSON.stringify(all));
  } catch {
    /* ignore quota errors */
  }
}

export function clearChatHistory(userId: string, sheetUrls: string[]) {
  if (!isBrowser() || !userId) return;
  try {
    const storeKey = chatStoreKey(userId);
    const raw = localStorage.getItem(storeKey);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>;
    delete all[chatStorageKey(sheetUrls)];
    localStorage.setItem(storeKey, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
