/** Hapus cache lokal browser (chat, filter, sheet lama, dll.) */

import { clearLegacyLocalStorage, clearUserLocalStorage } from "./user-local-storage";

export { clearLegacyLocalStorage, clearUserLocalStorage };

export function clearWorkspaceLocalStorage(userId?: string) {
  if (typeof window === "undefined") return;

  if (userId) clearUserLocalStorage(userId);
  clearLegacyLocalStorage();

  const params = new URLSearchParams(window.location.search);
  params.delete("sheet");
  params.delete("project");
  params.delete("layout");
  params.delete("scope");
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}
