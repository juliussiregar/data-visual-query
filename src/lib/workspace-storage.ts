/** Hapus cache lokal browser (chat, filter, sheet lama, dll.) */

const PREFIXES = [
  "sheetvision:",
  "sheetvision_",
];

const EXACT_KEYS = [
  "sheetvision:saved",
  "sheetvision:lastUrl",
];

export function clearWorkspaceLocalStorage() {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (EXACT_KEYS.includes(key) || PREFIXES.some((p) => key.startsWith(p))) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  const params = new URLSearchParams(window.location.search);
  params.delete("sheet");
  params.delete("project");
  params.delete("layout");
  params.delete("scope");
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}
