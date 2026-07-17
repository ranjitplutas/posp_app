/**
 * Single source of truth for frontend runtime config. Every NEXT_PUBLIC_* read
 * happens here and nowhere else — pages/components/services import `config`,
 * never `process.env` directly.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Check apps/web/.env.local.`);
  }
  return value;
}

export const config = {
  apiBaseUrl: requireEnv("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
  microsoft: {
    clientId: requireEnv("NEXT_PUBLIC_MICROSOFT_CLIENT_ID", process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID),
    tenantId: requireEnv("NEXT_PUBLIC_MICROSOFT_TENANT_ID", process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID),
    redirectUri: requireEnv("NEXT_PUBLIC_MICROSOFT_REDIRECT_URI", process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI),
  },
} as const;
