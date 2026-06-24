import type { DashboardLayout } from "./types";
import { hashLayoutKey, layoutKeyFromUrls } from "./layout";

const URL_PARAM = "lk";
const SHEET_PARAM = "sheet";

export function getLayoutKey(sheetUrls: string[]): string {
  return hashLayoutKey(layoutKeyFromUrls(sheetUrls));
}

export function getDashboardShareUrl(sheetUrls: string[]): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams();
  const primary = sheetUrls[0];
  if (primary) params.set(SHEET_PARAM, primary);
  params.set(URL_PARAM, getLayoutKey(sheetUrls));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export async function copyDashboardShareUrl(sheetUrls: string[]): Promise<boolean> {
  const url = getDashboardShareUrl(sheetUrls);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export async function fetchRemoteLayout(sheetUrls: string[]): Promise<DashboardLayout | null> {
  const key = getLayoutKey(sheetUrls);
  try {
    const res = await fetch(`/api/user/layouts?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { layout?: DashboardLayout | null };
    return json.layout ?? null;
  } catch {
    return null;
  }
}

export async function saveRemoteLayout(layout: DashboardLayout): Promise<boolean> {
  const key = getLayoutKey(layout.sheetUrls);
  try {
    const res = await fetch("/api/user/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, layout }),
    });
    if (!res.ok) return false;
    syncLayoutKeyToUrl(key);
    return true;
  } catch {
    return false;
  }
}

export function getLayoutKeyFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(URL_PARAM);
}

export function syncLayoutKeyToUrl(key: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set(URL_PARAM, key);
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}
