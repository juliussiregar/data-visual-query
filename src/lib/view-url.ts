import type { ViewId } from "./types";
import { NAV_SECTIONS } from "./nav-config";

const VIEW_PARAM = "view";

const VALID_VIEWS = new Set<ViewId>([
  ...NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.id)),
  "insights",
  "columns",
  "projects",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

export function isViewId(value: string): value is ViewId {
  return VALID_VIEWS.has(value as ViewId);
}

export function getViewFromUrl(): ViewId | null {
  if (!isBrowser()) return null;
  const value = new URLSearchParams(window.location.search).get(VIEW_PARAM);
  if (!value || !isViewId(value)) return null;
  return value;
}

/** Simpan tab aktif di URL agar refresh tidak kembali ke Overview. */
export function syncViewToUrl(view: ViewId) {
  if (!isBrowser()) return;
  const params = new URLSearchParams(window.location.search);
  if (view === "overview") {
    params.delete(VIEW_PARAM);
  } else {
    params.set(VIEW_PARAM, view);
  }
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}
