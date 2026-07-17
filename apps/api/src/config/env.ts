import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_PATH: z.string().default("/api/v1"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_SSL_MODE: z.enum(["require", "disable"]).default("disable"),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  MICROSOFT_CLIENT_ID: z.string().min(1, "MICROSOFT_CLIENT_ID is required"),
  MICROSOFT_TENANT_ID: z.string().min(1, "MICROSOFT_TENANT_ID is required"),
  MICROSOFT_ALLOWED_TENANT_IDS: z.string().min(1, "MICROSOFT_ALLOWED_TENANT_IDS is required"),
  MICROSOFT_AUTHORITY: z.string().url(),

  APP_JWT_ISSUER: z.string().default("digi-posp-api"),
  APP_JWT_AUDIENCE: z.string().default("digi-posp-web"),
  APP_JWT_SECRET: z.string().min(32, "APP_JWT_SECRET must be at least 32 characters"),
  APP_JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(600),

  CORS_ALLOWED_ORIGINS: z.string().min(1, "CORS_ALLOWED_ORIGINS is required"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(500),

  /** Comma-separated emails auto-promoted to ADMIN/ACTIVE on their very first login — replaces needing the CLI bootstrap for the initial admin(s). Normalized lowercase on comparison. */
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(""),

  /** Local/dev-only username+password login path, alongside Microsoft SSO. Set to "false" once real SSO is confirmed working — never intended for production. */
  ENABLE_PASSWORD_LOGIN: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const allowedTenantIds = env.MICROSOFT_ALLOWED_TENANT_IDS.split(",").map((id) => id.trim()).filter(Boolean);
export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);

const adminBootstrapEmails = new Set(
  env.ADMIN_BOOTSTRAP_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);

export function isBootstrapAdminEmail(email: string): boolean {
  return adminBootstrapEmails.has(email.trim().toLowerCase());
}
