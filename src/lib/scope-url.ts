import type { DataScope } from "./types";

const SCOPE_COL_PARAM = "scopeCol";
const SCOPE_VAL_PARAM = "scopeVal";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getScopeFromUrl(): DataScope | null {
  if (!isBrowser()) return null;
  const params = new URLSearchParams(window.location.search);
  const columnKey = params.get(SCOPE_COL_PARAM);
  const value = params.get(SCOPE_VAL_PARAM);
  if (!columnKey || !value) return null;
  return { columnKey, values: [decodeURIComponent(value)] };
}

export function syncScopeToUrl(scope: DataScope | null) {
  if (!isBrowser()) return;
  const params = new URLSearchParams(window.location.search);
  if (scope?.columnKey && scope.values[0]) {
    params.set(SCOPE_COL_PARAM, scope.columnKey);
    params.set(SCOPE_VAL_PARAM, encodeURIComponent(scope.values[0]));
  } else {
    params.delete(SCOPE_COL_PARAM);
    params.delete(SCOPE_VAL_PARAM);
  }
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}

export function buildShareableScopeUrl(baseUrl: string, scope: DataScope): string {
  const url = new URL(baseUrl);
  url.searchParams.set(SCOPE_COL_PARAM, scope.columnKey);
  url.searchParams.set(SCOPE_VAL_PARAM, scope.values[0] ?? "");
  return url.toString();
}
