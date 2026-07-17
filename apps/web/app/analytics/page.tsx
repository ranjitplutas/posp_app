"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { BarChart, type BarDatum } from "../../src/components/BarChart";
import { PieChart } from "../../src/components/PieChart";
import { analyticsService } from "../../src/services/analytics.service";

export default function AnalyticsPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN", "EXECUTIVE_MANAGER"]}>
      <AppShell>
        <AnalyticsContent />
      </AppShell>
    </RouteGuard>
  );
}

function AnalyticsContent() {
  const [stateData, setStateData] = useState<BarDatum[]>([]);
  const [educationData, setEducationData] = useState<BarDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [states, education] = await Promise.all([analyticsService.stateDistribution(), analyticsService.educationDistribution()]);
        setStateData(states);
        setEducationData(education);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stateTotal = stateData.reduce((sum, d) => sum + d.count, 0);
  const educationTotal = educationData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 20 }}>Network-wide POSP distribution across states and education levels.</p>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--color-text-muted)" }}>Loading…</div>
      ) : (
        <div className="do-analytics-grid">
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>POSPs by State</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 18 }}>
              {stateTotal.toLocaleString()} POSPs with Aadhaar verification data, resolved from address state.
            </div>
            <BarChart data={stateData} color="var(--color-primary)" />
          </div>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>POSPs by Education Level</div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 18 }}>
              {educationTotal.toLocaleString()} POSPs with a resolved qualification.
            </div>
            <PieChart data={educationData} />
          </div>
        </div>
      )}
    </div>
  );
}
