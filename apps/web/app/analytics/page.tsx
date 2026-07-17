"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { BarChart, type BarDatum } from "../../src/components/BarChart";
import { PieChart } from "../../src/components/PieChart";
import { FunnelChart, type FunnelStage } from "../../src/components/FunnelChart";
import { FunnelSmooth } from "../../src/components/FunnelSmooth";
import { ToggleGroup } from "../../src/components/ToggleGroup";
import { analyticsService } from "../../src/services/analytics.service";

type FunnelView = "bars" | "smooth";
const FUNNEL_VIEW_OPTIONS: { value: FunnelView; label: string }[] = [
  { value: "bars", label: "BARS" },
  { value: "smooth", label: "FUNNEL" },
];

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
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [funnelView, setFunnelView] = useState<FunnelView>("smooth");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [states, education, funnelData] = await Promise.all([
          analyticsService.stateDistribution(),
          analyticsService.educationDistribution(),
          analyticsService.onboardingFunnel(),
        ]);
        setStateData(states);
        setEducationData(education);
        setFunnel(funnelData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The stage with the single biggest drop-off is where the most users are getting stuck.
  const biggestDrop = funnel.slice(1).reduce<FunnelStage | null>((worst, s) => (!worst || s.dropOffFromPrevious > worst.dropOffFromPrevious ? s : worst), null);

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
        <>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Onboarding Funnel</div>
              <ToggleGroup options={FUNNEL_VIEW_OPTIONS} value={funnelView} onChange={setFunnelView} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 18 }}>
              Cumulative, excludes already-Completed POSPs — each stage requires every stage before it, so the numbers only ever shrink. Shows where still-onboarding POSPs are getting stuck.
            </div>
            {biggestDrop && (
              <div
                style={{
                  background: "var(--color-red-soft)",
                  color: "var(--color-red)",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 18,
                }}
              >
                Most users are getting stuck at <strong>{biggestDrop.label}</strong> — a {biggestDrop.dropOffFromPrevious}% drop-off from the previous stage.
              </div>
            )}
            {funnelView === "bars" ? <FunnelChart stages={funnel} /> : <FunnelSmooth stages={funnel} />}
          </div>

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
        </>
      )}
    </div>
  );
}
