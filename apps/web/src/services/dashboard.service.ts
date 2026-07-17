import { apiClient } from "../lib/http/api-client";
import type {
  ClusterManagerPerformanceRow,
  ClusterManagerTrendSeries,
  DashboardStats,
  Granularity,
  NeedsAttentionRow,
  TrendMetric,
  TrendPoint,
} from "../types/dashboard";

export const dashboardService = {
  stats(): Promise<DashboardStats> {
    return apiClient<DashboardStats>("/dashboard/stats");
  },
  trend(granularity: Granularity = "daily", metric: TrendMetric = "total"): Promise<TrendPoint[]> {
    return apiClient<TrendPoint[]>(`/dashboard/trend?granularity=${granularity}&metric=${metric}`);
  },
  needsAttention(limit = 10): Promise<NeedsAttentionRow[]> {
    return apiClient<NeedsAttentionRow[]>(`/dashboard/needs-attention?limit=${limit}`);
  },
  clusterPerformance(): Promise<ClusterManagerPerformanceRow[]> {
    return apiClient<ClusterManagerPerformanceRow[]>("/dashboard/cluster-performance");
  },
};

export const performanceService = {
  clusterManagers(): Promise<ClusterManagerPerformanceRow[]> {
    return apiClient<ClusterManagerPerformanceRow[]>("/performance/cluster-managers");
  },
  managerTrend(clusterManagerId: string, granularity: Granularity = "monthly", metric: TrendMetric = "total"): Promise<TrendPoint[]> {
    return apiClient<TrendPoint[]>(`/performance/cluster-managers/${clusterManagerId}/trend?granularity=${granularity}&metric=${metric}`);
  },
  compare(granularity: Granularity = "monthly", limit = 100): Promise<ClusterManagerTrendSeries[]> {
    return apiClient<ClusterManagerTrendSeries[]>(`/performance/compare?granularity=${granularity}&limit=${limit}`);
  },
};
