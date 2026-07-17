import { pool } from "./pool.js";

export type StatusCount = { status: number; count: number };

export async function countByStatus(clusterManagerId?: string): Promise<{ total: number; byStatus: StatusCount[] }> {
  const values: unknown[] = [];
  let where = "";
  if (clusterManagerId) {
    values.push(clusterManagerId);
    where = `WHERE cluser_manager_id = $1`;
  }

  const { rows } = await pool.query<{ status: number; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM digi_user ${where} GROUP BY status ORDER BY status`,
    values,
  );

  const byStatus = rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  const total = byStatus.reduce((sum, r) => sum + r.count, 0);
  return { total, byStatus };
}

export async function countActiveClusterManagers(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM digi_posp_app_users WHERE role = 'CLUSTER_MANAGER' AND status = 'ACTIVE'`,
  );
  return Number(rows[0]?.count ?? "0");
}

export type TrendPoint = { date: string; count: number };
export type Granularity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type TrendMetric = "total" | "approved" | "pending" | "rejected";

const GRANULARITY_CONFIG: Record<Granularity, { trunc: string; lookback: string; step: string }> = {
  daily: { trunc: "day", lookback: "30 days", step: "1 day" },
  weekly: { trunc: "week", lookback: "12 weeks", step: "1 week" },
  monthly: { trunc: "month", lookback: "12 months", step: "1 month" },
  quarterly: { trunc: "quarter", lookback: "8 quarters", step: "3 months" },
  yearly: { trunc: "year", lookback: "5 years", step: "1 year" },
};

const METRIC_FILTER: Record<TrendMetric, string> = {
  total: "",
  approved: "AND status IN (2, 3)",
  pending: "AND status IN (0, 1)",
  rejected: "AND status = -1",
};

/**
 * Zero-filled series over a date spine (generate_series), not just the days/weeks/months that
 * happen to have data — without this, sparse real data produces a jagged 1-2-point chart instead
 * of a continuous line, and the frontend has no reliable way to space/label points evenly.
 * Always returns full ISO dates (bucket start) — the frontend formats display labels itself.
 */
export async function onboardingTrend(
  granularity: Granularity,
  metric: TrendMetric,
  clusterManagerId?: string,
): Promise<TrendPoint[]> {
  const { trunc, lookback, step } = GRANULARITY_CONFIG[granularity];
  const metricFilter = METRIC_FILTER[metric];

  const values: unknown[] = [];
  let clusterFilter = "";
  if (clusterManagerId) {
    values.push(clusterManagerId);
    clusterFilter = `AND cluser_manager_id = $${values.length}`;
  }

  const { rows } = await pool.query<{ date: string; count: string }>(
    `
    WITH series AS (
      SELECT generate_series(
        date_trunc('${trunc}', now() - interval '${lookback}'),
        date_trunc('${trunc}', now()),
        interval '${step}'
      ) AS bucket
    ),
    counts AS (
      SELECT date_trunc('${trunc}', date_created) AS bucket, COUNT(*) AS count
      FROM digi_user
      WHERE date_created >= now() - interval '${lookback}' ${metricFilter} ${clusterFilter}
      GROUP BY 1
    )
    SELECT to_char(series.bucket, 'YYYY-MM-DD') AS date, COALESCE(counts.count, 0)::text AS count
    FROM series
    LEFT JOIN counts ON counts.bucket = series.bucket
    ORDER BY series.bucket
    `,
    values,
  );

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

export type ClusterManagerTrendRow = { clusterManagerId: string; date: string; count: number };

/**
 * Onboarding trend for several Cluster Managers at once, as one grouped query — the comparison
 * chart used to call onboardingTrend() once per manager (an N+1 round-trip per page load, N up to
 * ~100 with "compare all managers"). This does the same zero-filled generate_series spine but
 * cross-joined against the requested manager IDs, aggregated in a single pass.
 */
export async function onboardingTrendForManagers(granularity: Granularity, clusterManagerIds: string[]): Promise<ClusterManagerTrendRow[]> {
  if (clusterManagerIds.length === 0) return [];
  const { trunc, lookback, step } = GRANULARITY_CONFIG[granularity];

  const { rows } = await pool.query<{ clusterManagerId: string; date: string; count: string }>(
    `
    WITH series AS (
      SELECT generate_series(
        date_trunc('${trunc}', now() - interval '${lookback}'),
        date_trunc('${trunc}', now()),
        interval '${step}'
      ) AS bucket
    ),
    grid AS (
      SELECT cm_id, series.bucket
      FROM unnest($1::uuid[]) AS cm_id
      CROSS JOIN series
    ),
    counts AS (
      SELECT cluser_manager_id, date_trunc('${trunc}', date_created) AS bucket, COUNT(*) AS count
      FROM digi_user
      WHERE date_created >= now() - interval '${lookback}' AND cluser_manager_id = ANY($1::uuid[])
      GROUP BY 1, 2
    )
    SELECT grid.cm_id::text AS "clusterManagerId", to_char(grid.bucket, 'YYYY-MM-DD') AS date, COALESCE(counts.count, 0)::text AS count
    FROM grid
    LEFT JOIN counts ON counts.cluser_manager_id = grid.cm_id AND counts.bucket = grid.bucket
    ORDER BY grid.cm_id, grid.bucket
    `,
    [clusterManagerIds],
  );

  return rows.map((r) => ({ clusterManagerId: r.clusterManagerId, date: r.date, count: Number(r.count) }));
}

export type ClusterManagerPerformanceRow = {
  clusterManagerId: string;
  name: string;
  email: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
};

export async function clusterManagerPerformance(): Promise<ClusterManagerPerformanceRow[]> {
  const { rows } = await pool.query<{
    clusterManagerId: string;
    name: string;
    email: string;
    total: string;
    approved: string;
    rejected: string;
    pending: string;
  }>(
    `
    SELECT
      cm.id AS "clusterManagerId",
      cm.full_name AS name,
      cm.email AS email,
      COUNT(u.id)::text AS total,
      COUNT(u.id) FILTER (WHERE u.status IN (2, 3))::text AS approved,
      COUNT(u.id) FILTER (WHERE u.status = -1)::text AS rejected,
      COUNT(u.id) FILTER (WHERE u.status IN (0, 1))::text AS pending
    FROM digi_posp_app_users cm
    LEFT JOIN digi_user u ON u.cluser_manager_id = cm.id
    WHERE cm.role = 'CLUSTER_MANAGER' AND cm.status = 'ACTIVE'
    GROUP BY cm.id, cm.full_name, cm.email
    ORDER BY total DESC
    `,
  );

  return rows.map((r) => ({
    clusterManagerId: r.clusterManagerId,
    name: r.name,
    email: r.email,
    total: Number(r.total),
    approved: Number(r.approved),
    rejected: Number(r.rejected),
    pending: Number(r.pending),
  }));
}

export type NeedsAttentionRow = {
  id: number;
  pospId: string;
  fullName: string | null;
  status: number;
  dateCreated: string;
  clusterManagerName: string | null;
};

/** POSPs sitting in "In Approval" (status 1) longest — the ones most overdue for a decision. */
export async function needsAttention(limit: number, clusterManagerId?: string): Promise<NeedsAttentionRow[]> {
  const values: unknown[] = [limit];
  let clusterFilter = "";
  if (clusterManagerId) {
    values.push(clusterManagerId);
    clusterFilter = `AND u.cluser_manager_id = $${values.length}`;
  }

  const { rows } = await pool.query<NeedsAttentionRow>(
    `
    SELECT u.id, u.posp_id AS "pospId", u.user_fullname AS "fullName", u.status,
           u.date_created AS "dateCreated", cm.full_name AS "clusterManagerName"
    FROM digi_user u
    LEFT JOIN digi_posp_app_users cm ON cm.id = u.cluser_manager_id
    WHERE u.status = 1 ${clusterFilter}
    ORDER BY u.date_created ASC
    LIMIT $1
    `,
    values,
  );
  return rows;
}
