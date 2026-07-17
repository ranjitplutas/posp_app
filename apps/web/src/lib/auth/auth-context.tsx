"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { ensureMsalInitialized, loginRequest, msalInstance } from "../msal/msal-instance";
import { authService } from "../../services/auth.service";
import { onSessionExpired } from "../http/api-client";
import { clearSession, getAccessToken, registerRefreshFn, restoreAccessTokenFromStorage, setAccessToken } from "../http/token-store";
import { isJwtExpired } from "./jwt-decode";
import type { CurrentUser } from "../../types/auth";

export type AuthState =
  | "INITIALIZING"
  | "UNAUTHENTICATED"
  | "APP_AUTHENTICATED"
  | "PENDING_ROLE"
  | "DISABLED"
  | "ERROR";

type AuthContextValue = {
  state: AuthState;
  user: CurrentUser | null;
  error: string | null;
  login: () => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stateForUser(user: CurrentUser): AuthState {
  if (user.status === "PENDING_ROLE") return "PENDING_ROLE";
  if (user.status === "DISABLED") return "DISABLED";
  return "APP_AUTHENTICATED";
}

async function silentMicrosoftRefresh(): Promise<string | null> {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    const exchange = await authService.exchangeMicrosoftToken(result.idToken);
    setAccessToken(exchange.accessToken);
    return exchange.accessToken;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("INITIALIZING");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const login = useCallback(async () => {
    setError(null);
    try {
      await ensureMsalInitialized();
      const result = await msalInstance.loginPopup(loginRequest);
      const exchange = await authService.exchangeMicrosoftToken(result.idToken);
      setAccessToken(exchange.accessToken);
      setUser(exchange.user);
      setState(stateForUser(exchange.user));
    } catch (err) {
      setState("ERROR");
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    }
  }, []);

  const loginWithPassword = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const exchange = await authService.loginWithPassword(username, password);
      setAccessToken(exchange.accessToken);
      setUser(exchange.user);
      setState(stateForUser(exchange.user));
    } catch (err) {
      setState("ERROR");
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Best-effort — the token is stateless server-side; proceed with local cleanup regardless.
    }
    clearSession();
    setUser(null);
    setState("UNAUTHENTICATED");
    try {
      await msalInstance.clearCache();
    } catch {
      // Non-fatal — local app state is already cleared, which is what actually gates access.
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    registerRefreshFn(silentMicrosoftRefresh);
    onSessionExpired(() => {
      clearSession();
      setUser(null);
      setState("UNAUTHENTICATED");
    });

    (async () => {
      try {
        // Restore a session that survived a page refresh — sessionStorage persists across
        // reloads within the same tab (unlike our in-memory-only state) but is still cleared
        // on tab/browser close, unlike localStorage. The JWT's own expiry (server-configured
        // via APP_JWT_EXPIRES_IN_SECONDS) is the single source of truth for session timeout.
        const restored = restoreAccessTokenFromStorage();
        if (restored && !isJwtExpired(restored)) {
          try {
            const me = await authService.me();
            setUser(me);
            setState(stateForUser(me));
            return;
          } catch {
            // Token rejected server-side (revoked, disabled, etc.) — fall through to a clean re-auth.
            clearSession();
          }
        } else if (restored) {
          clearSession();
        }

        await ensureMsalInitialized();
        await msalInstance.handleRedirectPromise();

        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
          setState("UNAUTHENTICATED");
          return;
        }

        const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account }).catch((err) => {
          if (err instanceof InteractionRequiredAuthError) return null;
          throw err;
        });

        if (!result) {
          setState("UNAUTHENTICATED");
          return;
        }

        const exchange = await authService.exchangeMicrosoftToken(result.idToken);
        setAccessToken(exchange.accessToken);
        setUser(exchange.user);
        setState(stateForUser(exchange.user));
      } catch (err) {
        setState("ERROR");
        setError(err instanceof Error ? err.message : "Could not restore your session.");
      }
    })();
  }, []);

  return <AuthContext.Provider value={{ state, user, error, login, loginWithPassword, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Escape hatch for non-React code (e.g. token-store) that needs to check auth without hooks. */
export function hasActiveToken(): boolean {
  return getAccessToken() !== null;
}
