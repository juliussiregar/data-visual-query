export interface SavedSheet {
  id: string;
  url: string;
  label: string;
  savedAt: string;
  lastOpenedAt: string;
}

const SAVED_KEY = "sheetvision:saved";
const LAST_URL_KEY = "sheetvision:lastUrl";
const URL_PARAM = "sheet";

function isBrowser() {
  return typeof window !== "undefined";
}

export function deriveSheetLabel(url: string, custom?: string): string {
  if (custom?.trim()) return custom.trim();
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return `Sheet ${match[1].slice(0, 10)}`;
  return "Google Sheet";
}

export function getSheetFromUrl(): string | null {
  if (!isBrowser()) return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(URL_PARAM);
  return value ? decodeURIComponent(value) : null;
}

export function syncSheetToUrl(url: string) {
  if (!isBrowser()) return;
  const params = new URLSearchParams(window.location.search);
  params.set(URL_PARAM, url);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", next);
}

export function clearSheetFromUrl() {
  if (!isBrowser()) return;
  const params = new URLSearchParams(window.location.search);
  params.delete(URL_PARAM);
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}

export function getLastUrl(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(LAST_URL_KEY);
  } catch {
    return null;
  }
}

export function setLastUrl(url: string) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LAST_URL_KEY, url);
  } catch {
    /* ignore quota errors */
  }
}

export function getSavedSheets(): SavedSheet[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSheet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedSheets(sheets: SavedSheet[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(sheets.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function saveSheet(url: string, label?: string): SavedSheet {
  const now = new Date().toISOString();
  const sheets = getSavedSheets();
  const existing = sheets.find((s) => s.url === url);

  if (existing) {
    existing.label = label?.trim() || existing.label;
    existing.lastOpenedAt = now;
    writeSavedSheets(sheets);
    return existing;
  }

  const entry: SavedSheet = {
    id: crypto.randomUUID(),
    url,
    label: deriveSheetLabel(url, label),
    savedAt: now,
    lastOpenedAt: now,
  };
  writeSavedSheets([entry, ...sheets]);
  return entry;
}

export function removeSavedSheet(id: string) {
  writeSavedSheets(getSavedSheets().filter((s) => s.id !== id));
}

export function touchSavedSheet(url: string) {
  const sheets = getSavedSheets();
  const item = sheets.find((s) => s.url === url);
  if (item) {
    item.lastOpenedAt = new Date().toISOString();
    writeSavedSheets(sheets);
  }
}

export function getShareableUrl(url: string): string {
  if (!isBrowser()) return url;
  const params = new URLSearchParams();
  params.set(URL_PARAM, url);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export function truncateUrl(url: string, max = 48): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

export async function fetchSavedSheets(): Promise<SavedSheet[]> {
  try {
    const res = await fetch("/api/user/sheets");
    if (!res.ok) return [];
    const json = await res.json();
    return json.sheets ?? [];
  } catch {
    return [];
  }
}

export async function saveSheetRemote(url: string, label?: string): Promise<SavedSheet | null> {
  try {
    const res = await fetch("/api/user/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, label }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.sheet ?? null;
  } catch {
    return null;
  }
}

export async function removeSavedSheetRemote(id: string): Promise<boolean> {
  const res = await fetch(`/api/user/sheets?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function touchSavedSheetRemote(url: string) {
  await saveSheetRemote(url);
}
