"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { StatCard } from "../../src/components/StatCard";
import { StatusBadge } from "../../src/components/StatusBadge";
import { TrendChart } from "../../src/components/TrendChart";
import { ToggleGroup } from "../../src/components/ToggleGroup";
import { TotalIcon, PendingIcon, ApprovedIcon, RejectedIcon, ManagersIcon } from "../../src/components/icons";
import { useAuth } from "../../src/lib/auth/auth-context";
import { dashboardService } from "../../src/services/dashboard.service";
import type { ClusterManagerPerformanceRow, DashboardStats, Granularity, NeedsAttentionRow, TrendMetric, TrendPoint } from "../../src/types/dashboard";

export default function DashboardPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"]}>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </RouteGuard>
  );
}

const METRIC_OPTIONS: { value: TrendMetric; label: string }[] = [
  { value: "total", label: "TOTAL" },
  { value: "approved", label: "APPROVED" },
  { value: "pending", label: "PENDING" },
];
const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "DAILY" },
  { value: "weekly", label: "WEEKLY" },
  { value: "monthly", label: "MONTHLY" },
  { value: "quarterly", label: "QUARTERLY" },
  { value: "yearly", label: "YEARLY" },
];

function DashboardContent() {
  const { user } = useAuth();
  const canSeeClusterPerformance = user?.role === "ADMIN" || user?.role === "EXECUTIVE_MANAGER";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [metric, setMetric] = useState<TrendMetric>("total");
  const [granularity, setGranularity] = useState<Granularity>("weekly");
  const [trendLoading, setTrendLoading] = useState(false);
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionRow[]>([]);
  const [clusterPerf, setClusterPerf] = useState<ClusterManagerPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrend = useCallback(async (g: Granularity, m: TrendMetric) => {
    setTrendLoading(true);
    try {
      setTrend(await dashboardService.trend(g, m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trend.");
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, trendData, needsAttentionData] = await Promise.all([
          dashboardService.stats(),
          dashboardService.trend(granularity, metric),
          dashboardService.needsAttention(4),
        ]);
        setStats(statsData);
        setTrend(trendData);
        setNeedsAttention(needsAttentionData);
        if (canSeeClusterPerformance) {
          setClusterPerf(await dashboardService.clusterPerformance());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeMetric(m: TrendMetric) {
    setMetric(m);
    loadTrend(granularity, m);
  }
  function changeGranularity(g: Granularity) {
    setGranularity(g);
    loadTrend(g, metric);
  }

  const byStatus = new Map((stats?.byStatus ?? []).map((s) => [s.status, s.count]));
  const total = stats?.total ?? 0;
  const approved = (byStatus.get(2) ?? 0) + (byStatus.get(3) ?? 0);
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome, {user?.fullName}</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>{user?.email}</p>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--color-text-muted)" }}>Loading…</div>
      ) : (
        <>
          <div
            className="do-dashboard-stat-grid"
            style={{ gridTemplateColumns: canSeeClusterPerformance ? "repeat(5, 1fr)" : "repeat(4, 1fr)", marginBottom: 24 }}
          >
            <StatCard label="TOTAL POSPS" value={total} topColor="var(--color-primary)" iconBg="var(--color-primary-soft)" icon={<TotalIcon size={15} />} href="/posps" />
            <StatCard label="PENDING APPROVAL" value={byStatus.get(1) ?? 0} topColor="var(--color-amber)" iconBg="var(--color-amber-soft)" icon={<PendingIcon size={15} />} href="/posps?status=1" />
            <StatCard
              label="ONBOARDED POSPS"
              value={approved}
              topColor="var(--color-accent)"
              iconBg="var(--color-accent-soft)"
              icon={<ApprovedIcon size={15} />}
              subtext={`${approvalRate}% approval conversion`}
              href="/posps?status=2,3"
            />
            <StatCard label="REJECTED" value={byStatus.get(-1) ?? 0} topColor="var(--color-red)" iconBg="var(--color-red-soft)" icon={<RejectedIcon size={15} />} href="/posps?status=-1" />
            {canSeeClusterPerformance && (
              <StatCard label="CLUSTER MANAGERS" value={stats?.clusterManagerCount ?? 0} topColor="var(--color-primary)" iconBg="var(--color-primary-soft)" icon={<ManagersIcon size={15} />} href="/performance" />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: canSeeClusterPerformance ? "1.4fr 1fr" : "1fr", gap: 20 }}>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Network Onboarding Trend</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>POSPs across all Cluster Managers.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ToggleGroup options={METRIC_OPTIONS} value={metric} onChange={changeMetric} />
                  <ToggleGroup options={GRANULARITY_OPTIONS} value={granularity} onChange={changeGranularity} />
                </div>
              </div>
              <div style={{ marginTop: 14, opacity: trendLoading ? 0.5 : 1 }}>
                <TrendChart data={trend} />
              </div>
            </div>

            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Needs Attention</div>
                {needsAttention.length > 0 && (
                  <span style={{ background: "var(--color-amber-soft)", color: "var(--color-amber)", fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
                    {needsAttention.length} URGENT
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 14 }}>Applications with the nearest action deadline.</div>
              {needsAttention.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Nothing waiting — nice.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {needsAttention.map((row) => (
                    <Link
                      key={row.id}
                      href={`/posps/${row.id}`}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit", fontSize: 13 }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.fullName ?? row.pospId}</div>
                        <div style={{ color: "var(--color-text-subtle)", fontSize: 11.5 }}>
                          {row.pospId} {row.clusterManagerName ? `· ${row.clusterManagerName}` : ""}
                        </div>
                      </div>
                      <StatusBadge status={row.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {canSeeClusterPerformance && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Cluster Manager performance</div>
                <Link href="/performance" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
                  View full performance →
                </Link>
              </div>
              {clusterPerf.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No active Cluster Managers yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--color-text-muted)" }}>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Manager</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Total</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Approved</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Pending</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600 }}>Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterPerf.map((cm) => (
                      <tr key={cm.clusterManagerId} style={{ borderTop: "1px solid var(--color-line)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{cm.name}</td>
                        <td style={{ padding: "8px 10px" }}>{cm.total}</td>
                        <td style={{ padding: "8px 10px", color: "var(--color-accent-dark)" }}>{cm.approved}</td>
                        <td style={{ padding: "8px 10px" }}>{cm.pending}</td>
                        <td style={{ padding: "8px 10px", color: "var(--color-red)" }}>{cm.rejected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
