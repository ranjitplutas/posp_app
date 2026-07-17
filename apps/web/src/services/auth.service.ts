import { apiClient } from "../lib/http/api-client";
import type { CurrentUser, ExchangeResponse } from "../types/auth";

export const authService = {
  /** Exchanges a Microsoft ID token for an application JWT — the only call made without a bearer token already set. */
  exchangeMicrosoftToken(idToken: string): Promise<ExchangeResponse> {
    return apiClient<ExchangeResponse>("/auth/microsoft/exchange", {
      method: "POST",
      body: { idToken },
      skipAuth: true,
    });
  },

  /** Local/dev-only fallback — only works while the backend has ENABLE_PASSWORD_LOGIN=true. */
  loginWithPassword(username: string, password: string): Promise<ExchangeResponse> {
    return apiClient<ExchangeResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
      skipAuth: true,
    });
  },

  me(): Promise<CurrentUser> {
    return apiClient<CurrentUser>("/auth/me");
  },

  logout(): Promise<void> {
    return apiClient<void>("/auth/logout", { method: "POST" });
  },
};
