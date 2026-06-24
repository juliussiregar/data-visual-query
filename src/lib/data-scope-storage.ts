import type { DataScope } from "./types";
import { layoutKeyFromUrls } from "./layout";
import { userScopedKey } from "./user-local-storage";

function isBrowser() {
  return typeof window !== "undefined";
}

function storageKey(userId: string, urls: string[]): string {
  return userScopedKey(userId, `scope:${layoutKeyFromUrls(urls)}`);
}

export function loadDataScope(userId: string, urls: string[]): DataScope | null {
  if (!isBrowser() || !userId || urls.length === 0) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, urls));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataScope;
    if (!parsed.columnKey || !Array.isArray(parsed.values)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDataScope(userId: string, urls: string[], scope: DataScope | null) {
  if (!isBrowser() || !userId || urls.length === 0) return;
  const key = storageKey(userId, urls);
  if (!scope?.columnKey || scope.values.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(scope));
}
