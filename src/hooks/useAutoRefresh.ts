"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AutoRefreshInterval = 0 | 5 | 15 | 30;

const STORAGE_KEY = "sheetvision:autoRefreshMinutes";

export function loadAutoRefreshMinutes(): AutoRefreshInterval {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = parseInt(raw ?? "0", 10);
    if (n === 5 || n === 15 || n === 30) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveAutoRefreshMinutes(minutes: AutoRefreshInterval) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(minutes));
}

export function useAutoRefresh(
  enabled: boolean,
  intervalMinutes: AutoRefreshInterval,
  onRefresh: () => void | Promise<void>
) {
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const runRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefreshRef.current();
      setLastRefreshAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (!enabled || intervalMinutes === 0) return;
    const ms = intervalMinutes * 60 * 1000;
    const id = setInterval(() => void runRefresh(), ms);
    return () => clearInterval(id);
  }, [enabled, intervalMinutes, runRefresh]);

  return { lastRefreshAt, refreshing, runRefresh };
}
