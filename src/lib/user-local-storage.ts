const PREFIX = "sheetvision";
const ACTIVE_USER_KEY = `${PREFIX}:activeUserId`;

function isBrowser() {
  return typeof window !== "undefined";
}

export function setActiveUserId(userId: string | null) {
  if (!isBrowser()) return;
  if (userId) localStorage.setItem(ACTIVE_USER_KEY, userId);
  else localStorage.removeItem(ACTIVE_USER_KEY);
}

export function getActiveUserId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACTIVE_USER_KEY);
}

export function userScopedKey(userId: string, key: string): string {
  return `${PREFIX}:u:${userId}:${key}`;
}

/** Hapus cache lokal milik satu user. */
export function clearUserLocalStorage(userId: string) {
  if (!isBrowser()) return;
  const needle = `${PREFIX}:u:${userId}:`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(needle)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) localStorage.removeItem(key);
}

/** Format lama (tanpa user id) — dibersihkan saat logout / ganti akun. */
export function clearLegacyLocalStorage() {
  if (!isBrowser()) return;

  const legacyPrefixes = ["sheetvision:", "sheetvision_"];
  const legacyExact = ["sheetvision:saved", "sheetvision:lastUrl"];
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key === ACTIVE_USER_KEY) continue;
    if (legacyExact.includes(key) || legacyPrefixes.some((p) => key.startsWith(p))) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) localStorage.removeItem(key);
}
