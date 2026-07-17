/**
 * Holds the application JWT in memory for actual use, mirrored into
 * sessionStorage (never localStorage — sessionStorage is cleared when the
 * tab/browser closes, unlike localStorage which persists indefinitely) so a
 * page refresh doesn't lose the session. The token's own JWT expiry (set via
 * APP_JWT_EXPIRES_IN_SECONDS on the backend) is the single source of truth
 * for "session timeout" — there's no separate client-side timer to drift
 * out of sync with it.
 *
 * `refresh` is a pluggable function wired up by the MSAL auth provider —
 * this module has zero MSAL knowledge, it just knows how to hold a token and
 * de-duplicate concurrent refresh attempts.
 */
type RefreshFn = () => Promise<string | null>;

const STORAGE_KEY = "ds_session_token";

let accessToken: string | null = null;
let refreshFn: RefreshFn | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Called once on app boot, before anything else, to restore a token that survived a page refresh. */
export function restoreAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (stored) accessToken = stored;
  return accessToken;
}

export function registerRefreshFn(fn: RefreshFn): void {
  refreshFn = fn;
}

/** De-duplicated refresh — if a refresh is already in flight, every caller awaits the same promise instead of firing N silent MSAL requests. */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshFn) return null;

  if (!refreshInFlight) {
    refreshInFlight = refreshFn().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export function clearSession(): void {
  setAccessToken(null);
}
