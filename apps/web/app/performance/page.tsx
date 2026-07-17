"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { TrendChart } from "../../src/components/TrendChart";
import { MultiTrendChart } from "../../src/components/MultiTrendChart";
import { ToggleGroup } from "../../src/components/ToggleGroup";
import { performanceService } from "../../src/services/dashboard.service";
import type { ClusterManagerPerformanceRow, ClusterManagerTrendSeries, Granularity, TrendPoint } from "../../src/types/dashboard";

export default function PerformancePage() {
  return (
    <RouteGuard allowedRoles={["ADMIN", "EXECUTIVE_MANAGER"]}>
      <AppShell>
        <PerformanceContent />
      </AppShell>
    </RouteGuard>
  );
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "DAILY" },
  { value: "weekly", label: "WEEKLY" },
  { value: "monthly", label: "MONTHLY" },
  { value: "quarterly", label: "QUARTERLY" },
  { value: "yearly", label: "YEARLY" },
];

const VIEW_OPTIONS: { value: "chart" | "table"; label: string }[] = [
  { value: "chart", label: "CHART" },
  { value: "table", label: "TABLE" },
];

function formatPeriod(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function PerformanceContent() {
  const [managers, setManagers] = useState<ClusterManagerPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ClusterManagerPerformanceRow | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<TrendPoint[]>([]);
  const [selectedGranularity, setSelectedGranularity] = useState<Granularity>("monthly");
  const [selectedView, setSelectedView] = useState<"chart" | "table">("chart");

  const [compareGranularity, setCompareGranularity] = useState<Granularity>("monthly");
  const [compareSeries, setCompareSeries] = useState<ClusterManagerTrendSeries[]>([]);
  const [compareLoading, setCompareLoading] = useState(true);
  const [compareView, setCompareView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await performanceService.clusterManagers();
        setManagers(data);
        if (data[0]) selectManager(data[0], "monthly");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load performance data.");
      } finally {
        setLoading(false);
      }
    })();
    loadCompare("monthly");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectManager(m: ClusterManagerPerformanceRow, granularity: Granularity) {
    setSelected(m);
    setSelectedGranularity(granularity);
    try {
      setSelectedTrend(await performanceService.managerTrend(m.clusterManagerId, granularity));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trend.");
    }
  }

  async function loadCompare(granularity: Granularity) {
    setCompareGranularity(granularity);
    setCompareLoading(true);
    try {
      // No limit passed — every active Cluster Manager gets its own series, for a full side-by-side comparison.
      setCompareSeries(await performanceService.compare(granularity, 100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison.");
    } finally {
      setCompareLoading(false);
    }
  }

  const compareDates = Array.from(new Set(compareSeries.flatMap((s) => s.points.map((p) => p.date)))).sort();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Cluster Manager Performance</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 20 }}>Progress and comparison across active Cluster Managers.</p>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--color-primary-soft)", textAlign: "left" }}>
              <Th>Manager</Th>
              <Th>Total POSPs</Th>
              <Th>Approved</Th>
              <Th>Pending</Th>
              <Th>Rejected</Th>
              <Th>Approval Rate</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading…
                </td>
              </tr>
            ) : managers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  No active Cluster Managers yet.
                </td>
              </tr>
            ) : (
              managers.map((m) => {
                const rate = m.total > 0 ? Math.round((m.approved / m.total) * 100) : 0;
                const isSelected = selected?.clusterManagerId === m.clusterManagerId;
                return (
                  <tr
                    key={m.clusterManagerId}
                    onClick={() => selectManager(m, selectedGranularity)}
                    style={{ borderTop: "1px solid var(--color-line)", cursor: "pointer", background: isSelected ? "var(--color-bg)" : "transparent" }}
                  >
                    <Td>
                      <span style={{ fontWeight: 700, color: isSelected ? "var(--color-primary)" : "inherit" }}>{m.name}</span>
                    </Td>
                    <Td>{m.total}</Td>
                    <Td style={{ color: "var(--color-accent-dark)" }}>{m.approved}</Td>
                    <Td>{m.pending}</Td>
                    <Td style={{ color: "var(--color-red)" }}>{m.rejected}</Td>
                    <Td>{rate}%</Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}'s onboarding progress</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>Daily, weekly, monthly, quarterly, or yearly onboarding volume.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ToggleGroup options={VIEW_OPTIONS} value={selectedView} onChange={setSelectedView} />
              <ToggleGroup options={GRANULARITY_OPTIONS} value={selectedGranularity} onChange={(g) => selectManager(selected, g)} />
            </div>
          </div>
          {selectedView === "chart" ? (
            <TrendChart data={selectedTrend} />
          ) : (
            <PeriodTable rows={selectedTrend.map((p) => ({ period: formatPeriod(p.date), values: { [selected.name]: p.count } }))} columns={[selected.name]} />
          )}
        </div>
      )}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Comparison across Cluster Managers</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>Every active Cluster Manager as its own series — onboarding volume over time.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ToggleGroup options={VIEW_OPTIONS} value={compareView} onChange={setCompareView} />
            <ToggleGroup options={GRANULARITY_OPTIONS} value={compareGranularity} onChange={loadCompare} />
          </div>
        </div>
        {compareLoading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
        ) : compareView === "chart" ? (
          <MultiTrendChart series={compareSeries} />
        ) : (
          <PeriodTable
            rows={compareDates.map((date) => ({
              period: formatPeriod(date),
              values: Object.fromEntries(compareSeries.map((s) => [s.name, s.points.find((p) => p.date === date)?.count ?? 0])),
            }))}
            columns={compareSeries.map((s) => s.name)}
          />
        )}
      </div>
    </div>
  );
}

function PeriodTable({ rows, columns }: { rows: { period: string; values: Record<string, number> }[]; columns: string[] }) {
  if (rows.length === 0 || columns.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No data available.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
            <Th>Period</Th>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
            {columns.length > 1 && <Th>Total</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = columns.reduce((sum, c) => sum + (row.values[c] ?? 0), 0);
            return (
              <tr key={row.period} style={{ borderTop: "1px solid var(--color-line)" }}>
                <Td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.period}</Td>
                {columns.map((c) => (
                  <Td key={c}>{(row.values[c] ?? 0).toLocaleString()}</Td>
                ))}
                {columns.length > 1 && <Td style={{ fontWeight: 700 }}>{total.toLocaleString()}</Td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 14px", ...style }}>{children}</td>;
}
