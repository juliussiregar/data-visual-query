"use client";

import { useCallback, useEffect, useRef } from "react";
import type { DashboardLayout } from "@/lib/types";
import { saveRemoteLayout } from "@/lib/layout-storage";
import { saveProjectLayout } from "@/lib/project-storage";

export type LayoutSyncStatus = "synced" | "dirty" | "saving" | "error";

export function useLayoutAutoSave(
  layout: DashboardLayout | null,
  enabled: boolean,
  onStatusChange: (status: LayoutSyncStatus) => void,
  projectId?: string | null
) {
  const lastSavedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const persist = useCallback(async () => {
    const current = layoutRef.current;
    if (!current) return;
    onStatusChange("saving");
    const ok = projectId
      ? await saveProjectLayout(projectId, current)
      : await saveRemoteLayout(current);
    if (ok) {
      lastSavedRef.current = JSON.stringify(current);
      onStatusChange("synced");
    } else {
      onStatusChange("error");
    }
  }, [onStatusChange, projectId]);

  useEffect(() => {
    lastSavedRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!layout || !enabled) return;

    const serialized = JSON.stringify(layout);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      onStatusChange("synced");
      return;
    }
    if (serialized === lastSavedRef.current) return;

    onStatusChange("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist();
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [layout, enabled, persist, onStatusChange]);

  const flushSave = useCallback(
    async (override?: DashboardLayout) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const toSave = override ?? layoutRef.current;
      if (!toSave) return false;
      onStatusChange("saving");
      const ok = projectId
        ? await saveProjectLayout(projectId, toSave)
        : await saveRemoteLayout(toSave);
      if (ok) {
        lastSavedRef.current = JSON.stringify(toSave);
        onStatusChange("synced");
      } else {
        onStatusChange("error");
      }
      return ok;
    },
    [onStatusChange, projectId]
  );

  const markSynced = useCallback((l: DashboardLayout) => {
    lastSavedRef.current = JSON.stringify(l);
    onStatusChange("synced");
  }, [onStatusChange]);

  return { flushSave, markSynced };
}
