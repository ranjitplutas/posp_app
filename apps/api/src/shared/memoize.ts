/** Single-flight + TTL memoization for cheap-but-frequent reference-data lookups (e.g. education levels). Not for anything user-specific or write-sensitive. */
export function memoizeAsync<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let cached: { value: T; expiresAt: number } | null = null;
  let inFlight: Promise<T> | null = null;

  return async () => {
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (inFlight) return inFlight;

    inFlight = fn()
      .then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}
