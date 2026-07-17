export type StatusCount = { status: number; count: number };
export type DashboardStats = { total: number; byStatus: StatusCount[]; clusterManagerCount?: number };
export type TrendPoint = { date: string; count: number };
export type Granularity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type TrendMetric = "total" | "approved" | "pending" | "rejected";
export type NeedsAttentionRow = {
  id: number;
  pospId: string;
  fullName: string | null;
  status: number;
  dateCreated: string;
  clusterManagerName: string | null;
};
export type ClusterManagerPerformanceRow = {
  clusterManagerId: string;
  name: string;
  email: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
};
export type ClusterManagerTrendSeries = { clusterManagerId: string; name: string; points: TrendPoint[] };
