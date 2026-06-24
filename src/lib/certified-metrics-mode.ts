const STORAGE_KEY = "sheetvision:certifiedOnlyAI";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadCertifiedMetricsOnly(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveCertifiedMetricsOnly(enabled: boolean) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
