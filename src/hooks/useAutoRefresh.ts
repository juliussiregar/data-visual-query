"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { userScopedKey } from "@/lib/user-local-storage";

export type AutoRefreshInterval = 0 | 5 | 15 | 30;

function storageKey(userId: string) {
  return userScopedKey(userId, "autoRefreshMinutes");
}

export function loadAutoRefreshMinutes(userId: string): AutoRefreshInterval {
  if (typeof window === "undefined" || !userId) return 0;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const n = parseInt(raw ?? "0", 10);
    if (n === 5 || n === 15 || n === 30) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveAutoRefreshMinutes(userId: string, minutes: AutoRefreshInterval) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(storageKey(userId), String(minutes));
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
