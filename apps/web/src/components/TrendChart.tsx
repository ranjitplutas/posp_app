"use client";

import { useState } from "react";
import type { TrendPoint } from "../types/dashboard";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

const WIDTH = 640;
const HEIGHT = 200;
const PADDING_X = 32;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 28;

function formatLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);

  if (data.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>No onboarding activity in this range.</div>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const stepX = data.length > 1 ? (WIDTH - PADDING_X * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = PADDING_X + i * stepX;
    const y = PADDING_TOP + plotHeight - (d.count / max) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const baseline = PADDING_TOP + plotHeight;
  const areaPath = `${linePath} L ${points[points.length - 1]!.x.toFixed(1)} ${baseline} L ${points[0]!.x.toFixed(1)} ${baseline} Z`;

  // Show a label under every point up to ~14; beyond that, thin them out so labels don't collide.
  const labelStep = Math.max(1, Math.ceil(points.length / 14));

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Onboarding trend over time">
        <line x1={PADDING_X} y1={baseline} x2={WIDTH - PADDING_X} y2={baseline} stroke="var(--color-line)" strokeWidth={1} />

        <path d={areaPath} fill="var(--color-primary-soft)" opacity={0.5} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          const showLabel = i % labelStep === 0 || isLast;
          return (
            <g key={i}>
              {/* invisible larger hit area so hovering near a point (not just its tiny visible dot) shows the tooltip */}
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                fill="transparent"
                onMouseEnter={() =>
                  setHover({ xPct: (p.x / WIDTH) * 100, yPx: p.y, title: formatLabel(p.date), rows: [{ label: "Onboarded", value: p.count.toLocaleString() }] })
                }
                onMouseLeave={() => setHover(null)}
              />
              <circle cx={p.x} cy={p.y} r={isLast ? 4 : 2.5} fill="var(--color-primary)" style={{ pointerEvents: "none" }} />
              {showLabel && (
                <text
                  x={p.x}
                  y={HEIGHT - 8}
                  fontSize={9.5}
                  fill="var(--color-text-subtle)"
                  textAnchor={i === 0 ? "start" : isLast ? "end" : "middle"}
                >
                  {formatLabel(p.date)}
                </text>
              )}
              {isLast && p.count > 0 && (
                <text x={p.x} y={p.y - 8} fontSize={11} fontWeight={700} fill="var(--color-primary-dark)" textAnchor="end">
                  {p.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={hover} />
    </div>
  );
}
