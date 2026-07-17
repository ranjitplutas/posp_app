"use client";

import { useState } from "react";
import type { BarDatum } from "./BarChart";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

// Fixed categorical order — never cycled/reassigned as data changes, per the palette convention.
const SLICE_COLORS = ["#0b5278", "#78b82a", "#b8860b", "#c0392b", "#6c5ce7", "#00a3a3", "#e07b39"];
const OTHER_COLOR = "#9aa5ab";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

export function PieChart({ data, topN = 7 }: { data: BarDatum[]; topN?: number }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);

  if (data.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No data available.</div>;
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const otherTotal = rest.reduce((sum, d) => sum + d.count, 0);
  const slices = otherTotal > 0 ? [...head, { label: "Other", count: otherTotal }] : head;

  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
  const cx = 90;
  const cy = 90;
  const r = 80;
  const svgSize = 180;

  let cumulativeAngle = 0;
  const arcs = slices.map((s, i) => {
    const sweep = (s.count / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sweep;
    cumulativeAngle = endAngle;
    const color = s.label === "Other" ? OTHER_COLOR : SLICE_COLORS[i % SLICE_COLORS.length];
    const pct = Math.round((s.count / total) * 100);
    const midAngle = (startAngle + endAngle) / 2;
    const labelPos = polarToCartesian(cx, cy, r * 0.65, midAngle);
    return { ...s, color, path: sweep >= 359.99 ? null : arcPath(cx, cy, r, startAngle, endAngle), pct, labelPos };
  });

  function hoverFor(a: (typeof arcs)[number]) {
    setHover({
      xPct: (a.labelPos.x / svgSize) * 100,
      yPx: a.labelPos.y,
      title: a.label,
      rows: [{ label: "Count", value: `${a.count.toLocaleString()} (${a.pct}%)`, color: a.color }],
    });
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative" }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} role="img" aria-label="Distribution pie chart">
          {arcs.map((a) =>
            a.path ? (
              <path key={a.label} d={a.path} fill={a.color} stroke="var(--color-surface)" strokeWidth={1.5} onMouseEnter={() => hoverFor(a)} onMouseLeave={() => setHover(null)} />
            ) : (
              <circle key={a.label} cx={cx} cy={cy} r={r} fill={a.color} stroke="var(--color-surface)" strokeWidth={1.5} onMouseEnter={() => hoverFor(a)} onMouseLeave={() => setHover(null)} />
            ),
          )}
          {/* direct percentage labels on slices big enough to hold text, so the split is visible without hovering */}
          {arcs.map((a) =>
            a.pct >= 8 ? (
              <text
                key={`${a.label}-label`}
                x={a.labelPos.x}
                y={a.labelPos.y}
                fontSize={10.5}
                fontWeight={700}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: "none" }}
              >
                {a.pct}%
              </text>
            ) : null,
          )}
        </svg>
        <ChartTooltip state={hover} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 160 }}>
        {arcs.map((a) => (
          <div
            key={a.label}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "default" }}
            onMouseEnter={() => hoverFor(a)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={a.label}>
              {a.label}
            </span>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{a.count.toLocaleString()}</span>
            <span style={{ color: "var(--color-text-subtle)", fontSize: 11, width: 32, textAlign: "right" }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
