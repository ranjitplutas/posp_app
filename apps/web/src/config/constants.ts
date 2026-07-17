/** Non-secret, non-environment-specific constants — magic strings/numbers live here, not scattered inline. */

export const REQUEST_ID_HEADER = "x-request-id";
export const AUTHORIZATION_HEADER = "Authorization";

/** How much earlier than the JWT's real expiry we proactively refresh, to avoid a request racing expiry mid-flight. */
export const TOKEN_REFRESH_BUFFER_SECONDS = 30;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  ACCESS_PENDING: "/access-pending",
  ACCOUNT_DISABLED: "/account-disabled",
  ACCESS_DENIED: "/access-denied",
} as const;
