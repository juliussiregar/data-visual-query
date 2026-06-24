import type { ChatMessage } from "./types";

const CHAT_KEY = "sheetvision:chat";
export const CHAT_HISTORY_LIMIT = 5;

function isBrowser() {
  return typeof window !== "undefined";
}

export function chatStorageKey(sheetUrls: string[]): string {
  const normalized = [...new Set(sheetUrls.map((u) => u.trim()).filter(Boolean))].sort();
  return normalized.join("||") || "default";
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
    .map(({ role, content, actions }) => ({
      role,
      content,
      ...(actions?.length ? { actions } : {}),
    }));
}

export function loadChatHistory(sheetUrls: string[]): ChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
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

export function saveChatHistory(sheetUrls: string[], messages: ChatMessage[]) {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const all: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
    const key = chatStorageKey(sheetUrls);
    const trimmed = trimMessages(messages);
    if (trimmed.length === 0) {
      delete all[key];
    } else {
      all[key] = trimmed;
    }
    localStorage.setItem(CHAT_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota errors */
  }
}

export function clearChatHistory(sheetUrls: string[]) {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>;
    delete all[chatStorageKey(sheetUrls)];
    localStorage.setItem(CHAT_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
