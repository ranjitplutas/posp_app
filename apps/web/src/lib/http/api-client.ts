import { config } from "../../config/env";
import { AUTHORIZATION_HEADER, REQUEST_ID_HEADER } from "../../config/constants";
import { ApiError } from "./api-error";
import { getAccessToken, refreshAccessToken, clearSession } from "./token-store";

type Envelope<T> = { data: T; meta?: Record<string, unknown> };
type ErrorEnvelope = { error: { code: string; message: string; fields?: Record<string, string>; requestId?: string } };

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Skip attaching the bearer token — only the Microsoft exchange call needs this. */
  skipAuth?: boolean;
};

/** Fired when a request fails auth even after a silent-refresh attempt — the app shell listens for this to redirect to /login. */
export type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;
export function onSessionExpired(listener: SessionExpiredListener): void {
  sessionExpiredListener = listener;
}

function requestId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

async function parseErrorBody(res: Response): Promise<ErrorEnvelope["error"] | null> {
  try {
    const body = (await res.json()) as ErrorEnvelope;
    return body.error ?? null;
  } catch {
    return null;
  }
}

function toApiError(errBody: ErrorEnvelope["error"] | null, status: number): ApiError {
  return new ApiError({
    code: (errBody?.code as ApiError["code"]) ?? "INTERNAL_ERROR",
    message: errBody?.message ?? "Something went wrong. Please try again.",
    status,
    fields: errBody?.fields,
    requestId: errBody?.requestId,
  });
}

/**
 * The ONLY place in this app that calls fetch() against the backend API.
 * Every feature service (auth.service, users.service, posp.service) routes
 * through this — pages/components must never fetch directly. Handles: auth
 * header injection, request-id, 401 silent-refresh-and-retry (once), and
 * uniform error parsing. Returns the raw Response so callers decide how to
 * unwrap the envelope (apiClient vs apiClientWithMeta below).
 */
async function rawRequest(path: string, options: RequestOptions, isRetry = false): Promise<Response> {
  const { method = "GET", body, skipAuth = false } = options;

  const headers: Record<string, string> = { [REQUEST_ID_HEADER]: requestId() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers[AUTHORIZATION_HEADER] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({ code: "NETWORK_ERROR", message: "Could not reach the server. Check your connection.", status: 0 });
  }

  if (res.status === 401 && !skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return rawRequest(path, options, true);
    }
    clearSession();
    sessionExpiredListener?.();
    throw new ApiError({ code: "AUTH_TOKEN_EXPIRED", message: "Your session has expired. Please sign in again.", status: 401 });
  }

  if (!res.ok) {
    throw toApiError(await parseErrorBody(res), res.status);
  }

  return res;
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawRequest(path, options);
  if (res.status === 204) return undefined as T;
  const envelope = (await res.json()) as Envelope<T>;
  return envelope.data;
}

/** Same as apiClient, but also returns `meta` — use for paginated list endpoints. */
export async function apiClientWithMeta<T, M = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: M }> {
  const res = await rawRequest(path, options);
  const envelope = (await res.json()) as Envelope<T> & { meta: M };
  return { data: envelope.data, meta: envelope.meta };
}
