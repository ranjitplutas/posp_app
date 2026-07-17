"use client";

import { useCallback, useEffect, useState } from "react";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { systemService, type SystemHealth } from "../../src/services/system.service";

const AUTO_REFRESH_MS = 15_000;

export default function SystemHealthPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN"]}>
      <AppShell>
        <SystemHealthContent />
      </AppShell>
    </RouteGuard>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean);
  return parts.join(" ");
}

function SystemHealthContent() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await systemService.health();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the API.");
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>System Health</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            Live API, database, and error status. Auto-refreshes every {AUTO_REFRESH_MS / 1000}s.
            {lastChecked && ` Last checked ${lastChecked.toLocaleTimeString()}.`}
          </p>
        </div>
        <button
          onClick={load}
          style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: 13, fontWeight: 600 }}
        >
          Refresh now
        </button>
      </div>

      {error && (
        <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Could not load system health: {error}
        </div>
      )}

      {loading && !health ? (
        <div style={{ color: "var(--color-text-muted)" }}>Loading…</div>
      ) : health ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
            <StatusCard
              label="OVERALL STATUS"
              ok={health.status === "ok"}
              value={health.status === "ok" ? "Operational" : "Degraded"}
              subtext={`Checked at ${formatTimestamp(health.timestamp)}`}
            />
            <StatusCard
              label="API"
              ok
              value="Reachable"
              subtext={`${health.api.env} · uptime ${formatUptime(health.uptimeSeconds)}`}
            />
            <StatusCard
              label="DATABASE"
              ok={health.database.status === "ok"}
              value={health.database.status === "ok" ? `${health.database.latencyMs}ms latency` : "Unreachable"}
              subtext={
                health.database.status === "ok"
                  ? `Pool: ${health.database.pool.total} total · ${health.database.pool.idle} idle · ${health.database.pool.waiting} waiting`
                  : health.database.error
              }
            />
            <StatusCard label="MEMORY" ok value={`${health.memory.rssMb} MB RSS`} subtext={`${health.memory.heapUsedMb} MB heap used`} />
          </div>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Recent server errors</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Last {health.recentErrors.length} unhandled/5xx error{health.recentErrors.length === 1 ? "" : "s"} since the API process last started.
            </div>
            {health.recentErrors.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "12px 0" }}>No server errors recorded. All clear.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                      <Th>Time</Th>
                      <Th>Status</Th>
                      <Th>Code</Th>
                      <Th>Path</Th>
                      <Th>Message</Th>
                      <Th>Request ID</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.recentErrors.map((e) => (
                      <tr key={e.requestId + e.timestamp} style={{ borderTop: "1px solid var(--color-line)" }}>
                        <Td style={{ whiteSpace: "nowrap" }}>{formatTimestamp(e.timestamp)}</Td>
                        <Td>
                          <span style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>
                            {e.statusCode}
                          </span>
                        </Td>
                        <Td style={{ fontFamily: "monospace", fontSize: 11.5 }}>{e.code}</Td>
                        <Td style={{ fontFamily: "monospace", fontSize: 11.5 }}>{e.path}</Td>
                        <Td>{e.message}</Td>
                        <Td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-subtle)" }}>{e.requestId}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusCard({ label, ok, value, subtext }: { label: string; ok: boolean; value: string; subtext?: string }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderTop: `3px solid ${ok ? "var(--color-accent)" : "var(--color-red)"}`,
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-text-subtle)" }}>{label}</div>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: ok ? "var(--color-accent)" : "var(--color-red)",
            boxShadow: ok ? "0 0 0 3px var(--color-accent-soft)" : "0 0 0 3px var(--color-red-soft)",
          }}
        />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 14px", ...style }}>{children}</td>;
}
