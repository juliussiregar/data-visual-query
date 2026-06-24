import type { DataScope } from "./types";
import { layoutKeyFromUrls } from "./layout";

const PREFIX = "sheetvision:scope:";

function isBrowser() {
  return typeof window !== "undefined";
}

function storageKey(urls: string[]): string {
  return `${PREFIX}${layoutKeyFromUrls(urls)}`;
}

export function loadDataScope(urls: string[]): DataScope | null {
  if (!isBrowser() || urls.length === 0) return null;
  try {
    const raw = localStorage.getItem(storageKey(urls));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataScope;
    if (!parsed.columnKey || !Array.isArray(parsed.values)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDataScope(urls: string[], scope: DataScope | null) {
  if (!isBrowser() || urls.length === 0) return;
  const key = storageKey(urls);
  if (!scope?.columnKey || scope.values.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(scope));
}
