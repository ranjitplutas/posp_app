import { Pool } from "pg";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL_MODE === "require" ? { rejectUnauthorized: true } : undefined,
  min: env.DB_POOL_MIN,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});

pool.on("error", (err) => {
  // Fired for idle clients that error out in the background (e.g. connection dropped by the DB) —
  // must be handled or an unhandled 'error' event crashes the whole process.
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
});

// Wrap pool.query once, transparently, so every existing call site (pool.query(...) across the
// repository modules) gets slow-query logging for free — no call-site changes needed. Logs queries
// slower than SLOW_QUERY_THRESHOLD_MS instead of silently letting them go unnoticed.
type PromiseQuery = (text: unknown, params?: unknown) => Promise<unknown>;
const originalQuery = pool.query.bind(pool) as PromiseQuery;
pool.query = ((...args: Parameters<PromiseQuery>) => {
  const start = performance.now();
  const logIfSlow = () => {
    const durationMs = Math.round(performance.now() - start);
    if (durationMs >= env.SLOW_QUERY_THRESHOLD_MS) {
      const text = typeof args[0] === "string" ? args[0] : (args[0] as { text?: string })?.text;
      logger.warn({ durationMs, query: text?.replace(/\s+/g, " ").trim().slice(0, 300) }, "Slow query");
    }
  };
  return originalQuery(...args).then(
    (value) => {
      logIfSlow();
      return value;
    },
    (err) => {
      logIfSlow();
      throw err;
    },
  );
}) as typeof pool.query;

/** Runs `fn` with a pooled client, always releasing it — use for anything needing more than one statement. */
export async function withClient<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    logger.error({ err }, "Database readiness check failed");
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
