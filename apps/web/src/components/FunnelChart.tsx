"use client";

import { useState } from "react";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

export type FunnelStage = { stage: string; label: string; count: number; percentOfSignedUp: number; dropOffFromPrevious: number };

/**
 * Ordered funnel — stage order is fixed (never sorted by value, unlike BarChart), bar width is
 * relative to the first stage so the shrinking shape itself shows where users drop off. Single
 * hue (sequential magnitude down a fixed set of ordered stages, not a categorical comparison).
 */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);

  if (stages.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No data available.</div>;
  }

  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
      {stages.map((s, i) => {
        const widthPct = (s.count / max) * 100;
        const isBiggestDrop = i > 0 && s.dropOffFromPrevious >= 15;
        return (
          <div key={s.stage}>
            <div
              onMouseEnter={() =>
                setHover({
                  xPct: 50,
                  yPx: i * 40,
                  title: s.label,
                  rows: [
                    { label: "Users", value: s.count.toLocaleString(), color: "var(--color-primary)" },
                    { label: "% of signed up", value: `${s.percentOfSignedUp}%` },
                    ...(i > 0 ? [{ label: "Drop-off from previous", value: `${s.dropOffFromPrevious}%` }] : []),
                  ],
                })
              }
              onMouseLeave={() => setHover(null)}
              style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px", alignItems: "center", gap: 10 }}
            >
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.label}
              </div>
              <div style={{ background: "var(--color-bg)", borderRadius: 4, height: 22, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: "var(--color-primary)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                    minWidth: 40,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{s.percentOfSignedUp}%</span>
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.count.toLocaleString()}</div>
            </div>
            {i > 0 && (
              <div style={{ marginLeft: 150, fontSize: 11, color: isBiggestDrop ? "var(--color-red)" : "var(--color-text-subtle)", fontWeight: isBiggestDrop ? 700 : 400 }}>
                ↓ {s.dropOffFromPrevious}% drop-off from {stages[i - 1]!.label}
              </div>
            )}
          </div>
        );
      })}
      <ChartTooltip state={hover} />
    </div>
  );
}
