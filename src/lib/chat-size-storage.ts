export type ChatPanelSize = "default" | "large" | "fullscreen";

const KEY = "sheetvision:chat-size";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadChatPanelSize(): ChatPanelSize {
  if (!isBrowser()) return "default";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "large" || raw === "fullscreen" || raw === "default") return raw;
  } catch {
    /* ignore */
  }
  return "default";
}

export function saveChatPanelSize(size: ChatPanelSize) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, size);
  } catch {
    /* ignore */
  }
}

export function cycleChatPanelSize(current: ChatPanelSize): ChatPanelSize {
  if (current === "default") return "large";
  if (current === "large") return "fullscreen";
  return "default";
}

export function chatPanelSizeLabel(size: ChatPanelSize): string {
  switch (size) {
    case "large":
      return "Perbesar";
    case "fullscreen":
      return "Layar penuh";
    default:
      return "Ukuran normal";
  }
}
