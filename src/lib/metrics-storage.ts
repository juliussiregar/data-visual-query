import type { MetricDefinition } from "./types";
import { layoutKeyFromUrls } from "./layout";

const PREFIX = "sheetvision:metrics:";

function isBrowser() {
  return typeof window !== "undefined";
}

function storageKey(urls: string[]): string {
  return `${PREFIX}${layoutKeyFromUrls(urls)}`;
}

export interface SavedMetric extends MetricDefinition {
  createdAt: string;
  createdBy?: string;
}

export function loadSavedMetrics(urls: string[]): SavedMetric[] {
  if (!isBrowser() || urls.length === 0) return [];
  try {
    const raw = localStorage.getItem(storageKey(urls));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedMetric[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedMetrics(urls: string[], metrics: SavedMetric[]) {
  if (!isBrowser() || urls.length === 0) return;
  localStorage.setItem(storageKey(urls), JSON.stringify(metrics.slice(0, 50)));
}

export function upsertSavedMetric(urls: string[], metric: SavedMetric): SavedMetric[] {
  const existing = loadSavedMetrics(urls);
  const idx = existing.findIndex((m) => m.id === metric.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = metric;
  else next.unshift(metric);
  saveSavedMetrics(urls, next);
  return next;
}

export function removeSavedMetric(urls: string[], id: string): SavedMetric[] {
  const next = loadSavedMetrics(urls).filter((m) => m.id !== id);
  saveSavedMetrics(urls, next);
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
