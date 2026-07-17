"use client";

import { useState } from "react";
import type { FunnelStage } from "./FunnelChart";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

const COL_WIDTH = 190;
const HEIGHT = 260;
const CY = HEIGHT / 2;
const MAX_H = 220;
const MIN_H = 60;
const FLAT_FRACTION = 0.35; // portion of each column that stays flat before curving toward the next stage's height

/**
 * Horizontal smooth-curved funnel (reaviz-style) — one continuous gradient-filled
 * shape, S-curved transitions between stage widths instead of straight tapered
 * edges, dark backdrop to match the reference. Same underlying data as
 * FunnelChart/FunnelPyramid, just a different rendering.
 */
export function FunnelSmooth({ stages }: { stages: FunnelStage[] }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);

  if (stages.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No data available.</div>;
  }

  const max = Math.max(...stages.map((s) => s.count), 1);
  const halfHeightFor = (count: number) => (MIN_H + (count / max) * (MAX_H - MIN_H)) / 2;
  const width = stages.length * COL_WIDTH;

  // One edge (top: halfSign=-1, bottom: halfSign=+1) as a left-to-right SVG path fragment —
  // flat for the first part of each column, then an S-curve (cubic bezier, symmetric control
  // points) into the next stage's height, arriving exactly at the column's right edge.
  function buildEdgeLTR(halfSign: 1 | -1): string {
    let d = "";
    stages.forEach((s, i) => {
      const x0 = i * COL_WIDTH;
      const x1 = x0 + COL_WIDTH;
      const flatX = x0 + COL_WIDTH * FLAT_FRACTION;
      const h0 = halfHeightFor(s.count);
      const isLast = i === stages.length - 1;
      const h1 = isLast ? h0 : halfHeightFor(stages[i + 1]!.count);
      const y0 = CY + halfSign * h0;
      const y1 = CY + halfSign * h1;

      if (i === 0) d += `M ${x0} ${y0} `;
      d += `L ${flatX} ${y0} `;
      if (!isLast) {
        const midX = (flatX + x1) / 2;
        d += `C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1} `;
      } else {
        d += `L ${x1} ${y0} `;
      }
    });
    return d;
  }

  // Same shape, traversed right-to-left, so it can be appended after the top edge to close one path.
  function buildEdgeRTL(halfSign: 1 | -1): string {
    let d = "";
    for (let i = stages.length - 1; i >= 0; i--) {
      const x0 = i * COL_WIDTH;
      const x1 = x0 + COL_WIDTH;
      const flatX = x0 + COL_WIDTH * FLAT_FRACTION;
      const h0 = halfHeightFor(stages[i]!.count);
      const isLast = i === stages.length - 1;
      const h1 = isLast ? h0 : halfHeightFor(stages[i + 1]!.count);
      const yFlat = CY + halfSign * h0;
      const yNext = CY + halfSign * h1;

      if (i === stages.length - 1) d += `L ${x1} ${yFlat} `;
      if (!isLast) {
        const midX = (flatX + x1) / 2;
        d += `C ${midX} ${yNext}, ${midX} ${yFlat}, ${flatX} ${yFlat} `;
      }
      d += `L ${x0} ${yFlat} `;
    }
    return d;
  }

  const fullPath = `${buildEdgeLTR(-1)} ${buildEdgeRTL(1)} Z`;

  return (
    <div style={{ position: "relative", background: "#0d1220", borderRadius: 10, padding: "16px 0", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Onboarding funnel (smooth)">
        <defs>
          <linearGradient id="funnel-smooth-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3f7ff0" />
            <stop offset="100%" stopColor="#1a2a63" />
          </linearGradient>
        </defs>

        <path d={fullPath} fill="url(#funnel-smooth-gradient)" />

        {stages.map((s, i) => {
          const x0 = i * COL_WIDTH;
          const isLastCol = i === stages.length - 1;
          return (
            <g key={s.stage}>
              {!isLastCol && <line x1={x0 + COL_WIDTH} y1={8} x2={x0 + COL_WIDTH} y2={HEIGHT - 8} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />}
              <rect
                x={x0}
                y={0}
                width={COL_WIDTH}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() =>
                  setHover({
                    xPct: ((x0 + COL_WIDTH / 2) / width) * 100,
                    yPx: CY - halfHeightFor(s.count) - 6,
                    title: s.label,
                    rows: [
                      { label: "Users", value: s.count.toLocaleString() },
                      { label: "% of signed up", value: `${s.percentOfSignedUp}%` },
                      ...(i > 0 ? [{ label: "Drop-off from previous", value: `${s.dropOffFromPrevious}%` }] : []),
                    ],
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
              <text x={x0 + 14} y={CY - 10} fontSize={26} fontWeight={800} fill="#fff" style={{ pointerEvents: "none" }}>
                {s.count.toLocaleString()}
              </text>
              <text x={x0 + 14} y={CY + 14} fontSize={13} fill="rgba(255,255,255,0.85)" style={{ pointerEvents: "none" }}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={hover} />
    </div>
  );
}
