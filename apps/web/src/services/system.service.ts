import { apiClient } from "../lib/http/api-client";

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
  recentErrors: { timestamp: string; statusCode: number; code: string; message: string; path: string; requestId: string }[];
};

export const systemService = {
  // Never cached — this page exists specifically to show current, live status.
  health(): Promise<SystemHealth> {
    return apiClient<SystemHealth>("/system/health");
  },
};
