/**
 * Small in-memory + sessionStorage-backed TTL cache for read-heavy, low-churn
 * fetches (POSP list pages, cluster-manager dropdowns) — avoids re-hitting the
 * API every time the user navigates back to a page they were just on. Module-level
 * state survives client-side navigation (the JS module stays loaded); the
 * sessionStorage mirror lets it also survive a page refresh, cleared on tab close.
 */
type CacheEntry<T> = { value: T; expiresAt: number };

const memoryCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = "ds_cache_";

function readFromStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // sessionStorage full/unavailable — the in-memory cache still works for this tab session.
  }
}

export async function cached<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
  const now = Date.now();

  const inMemory = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (inMemory && inMemory.expiresAt > now) return inMemory.value;

  const stored = readFromStorage<T>(key);
  if (stored && stored.expiresAt > now) {
    memoryCache.set(key, stored);
    return stored.value;
  }

  const value = await fetchFn();
  const entry = { value, expiresAt: now + ttlMs };
  memoryCache.set(key, entry);
  writeToStorage(key, entry);
  return value;
}

/** Call after any write that invalidates cached reads (e.g. assigning a cluster manager) — clears every cache entry whose key starts with `prefix`. */
export function invalidateCache(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX + prefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => window.sessionStorage.removeItem(k));
}
