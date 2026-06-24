import type { MetricDefinition } from "./types";
import { layoutKeyFromUrls } from "./layout";
import { userScopedKey } from "./user-local-storage";

function isBrowser() {
  return typeof window !== "undefined";
}

function storageKey(userId: string, urls: string[]): string {
  return userScopedKey(userId, `metrics:${layoutKeyFromUrls(urls)}`);
}

export interface SavedMetric extends MetricDefinition {
  createdAt: string;
  createdBy?: string;
}

export function loadSavedMetrics(userId: string, urls: string[]): SavedMetric[] {
  if (!isBrowser() || !userId || urls.length === 0) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId, urls));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMetric[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedMetrics(userId: string, urls: string[], metrics: SavedMetric[]) {
  if (!isBrowser() || !userId || urls.length === 0) return;
  localStorage.setItem(storageKey(userId, urls), JSON.stringify(metrics.slice(0, 50)));
}

export function upsertSavedMetric(userId: string, urls: string[], metric: SavedMetric): SavedMetric[] {
  const existing = loadSavedMetrics(userId, urls);
  const idx = existing.findIndex((m) => m.id === metric.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = metric;
  else next.unshift(metric);
  saveSavedMetrics(userId, urls, next);
  return next;
}

export function removeSavedMetric(userId: string, urls: string[], id: string): SavedMetric[] {
  const next = loadSavedMetrics(userId, urls).filter((m) => m.id !== id);
  saveSavedMetrics(userId, urls, next);
  return next;
}

export function mergeMetricDefinitions(
  auto: MetricDefinition[],
  saved: SavedMetric[]
): MetricDefinition[] {
  const savedIds = new Set(saved.map((m) => m.id));
  const autoFiltered = auto.filter((m) => !savedIds.has(m.id));
  return [...saved, ...autoFiltered];
}
