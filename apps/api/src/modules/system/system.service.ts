import { pool } from "../../database/pool.js";
import { env } from "../../config/env.js";
import { getRecentErrors } from "../../shared/recent-errors.js";

const START_TIME = Date.now();

export type SystemHealth = {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  api: { env: string; version: string };
  database: {
    status: "ok" | "error";
    latencyMs: number | null;
    pool: { total: number; idle: number; waiting: number };
    error?: string;
  };
  memory: { rssMb: number; heapUsedMb: number };
  recentErrors: ReturnType<typeof getRecentErrors>;
};

async function checkDatabase(): Promise<SystemHealth["database"]> {
  const start = performance.now();
  try {
    await pool.query("SELECT 1");
    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - start),
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const database = await checkDatabase();
  const mem = process.memoryUsage();
  const recentErrors = getRecentErrors();

  return {
    status: database.status === "ok" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - START_TIME) / 1000),
    api: { env: env.NODE_ENV, version: "0.1.0" },
    database,
    memory: { rssMb: Math.round(mem.rss / 1_048_576), heapUsedMb: Math.round(mem.heapUsed / 1_048_576) },
    recentErrors,
  };
}
