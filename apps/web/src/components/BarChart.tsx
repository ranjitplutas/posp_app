"use client";

import { useState } from "react";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

export type BarDatum = { label: string; count: number };

/** Horizontal bar list — sorted desc, single hue, direct value labels. Caps to topN + an "Other" bucket so long-tail category lists (e.g. states) stay readable. */
export function BarChart({ data, topN = 8, color = "var(--color-primary)" }: { data: BarDatum[]; topN?: number; color?: string }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);

  if (data.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No data available.</div>;
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const otherTotal = rest.reduce((sum, d) => sum + d.count, 0);
  const rows = otherTotal > 0 ? [...head, { label: "Other", count: otherTotal }] : head;

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{ display: "grid", gridTemplateColumns: "120px 1fr 44px", alignItems: "center", gap: 10 }}
          onMouseEnter={() => setHover({ xPct: 50, yPx: i * 26, title: row.label, rows: [{ label: "Count", value: row.count.toLocaleString(), color }] })}
          onMouseLeave={() => setHover(null)}
        >
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.label}
          </div>
          <div style={{ background: "var(--color-bg)", borderRadius: 4, height: 16, overflow: "hidden" }}>
            <div style={{ width: `${(row.count / max) * 100}%`, height: "100%", background: color, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{row.count.toLocaleString()}</div>
        </div>
      ))}
      <ChartTooltip state={hover} />
    </div>
  );
}
