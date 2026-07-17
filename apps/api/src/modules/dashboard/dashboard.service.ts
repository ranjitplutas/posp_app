import {
  clusterManagerPerformance,
  countActiveClusterManagers,
  countByStatus,
  needsAttention,
  onboardingTrend,
  onboardingTrendForManagers,
  type Granularity,
  type TrendMetric,
} from "../../database/dashboard.repository.js";
import type { CallerScope } from "../posp/posp.service.js";

function scopedClusterManagerId(scope: CallerScope): string | undefined {
  return scope.role === "CLUSTER_MANAGER" ? scope.userId : undefined;
}

export async function getStats(scope: CallerScope) {
  const [statusCounts, clusterManagerCount] = await Promise.all([
    countByStatus(scopedClusterManagerId(scope)),
    scope.role === "CLUSTER_MANAGER" ? Promise.resolve(undefined) : countActiveClusterManagers(),
  ]);
  return { ...statusCounts, clusterManagerCount };
}

export async function getTrend(scope: CallerScope, granularity: Granularity, metric: TrendMetric) {
  return onboardingTrend(granularity, metric, scopedClusterManagerId(scope));
}

export async function getClusterManagerPerformance() {
  return clusterManagerPerformance();
}

export async function getClusterManagerTrend(clusterManagerId: string, granularity: Granularity, metric: TrendMetric) {
  return onboardingTrend(granularity, metric, clusterManagerId);
}

/** Overlays the top N (by total) active Cluster Managers' onboarding trends for side-by-side comparison. */
export async function getClusterManagerComparison(granularity: Granularity, limit: number) {
  const managers = (await clusterManagerPerformance()).slice(0, limit);
  if (managers.length === 0) return [];

  // One grouped query for every manager's trend, instead of one query per manager.
  const rows = await onboardingTrendForManagers(
    granularity,
    managers.map((m) => m.clusterManagerId),
  );
  const pointsByManager = new Map<string, { date: string; count: number }[]>();
  for (const row of rows) {
    const points = pointsByManager.get(row.clusterManagerId) ?? [];
    points.push({ date: row.date, count: row.count });
    pointsByManager.set(row.clusterManagerId, points);
  }

  return managers.map((m) => ({
    clusterManagerId: m.clusterManagerId,
    name: m.name,
    points: pointsByManager.get(m.clusterManagerId) ?? [],
  }));
}

export async function getNeedsAttention(scope: CallerScope, limit: number) {
  return needsAttention(limit, scopedClusterManagerId(scope));
}
