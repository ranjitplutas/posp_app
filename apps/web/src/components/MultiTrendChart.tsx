"use client";

import { useState } from "react";
import type { ClusterManagerTrendSeries } from "../types/dashboard";
import { ChartTooltip, type ChartTooltipState } from "./ChartTooltip";

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 24;

// Fixed categorical order — never cycled/reassigned as data changes, per the palette convention.
// 12 distinct hues; a 13th+ cluster manager repeats a color (legend/name text still disambiguates).
const SERIES_COLORS = [
  "#0b5278",
  "#78b82a",
  "#b8860b",
  "#c0392b",
  "#6c5ce7",
  "#00a3a3",
  "#e07b39",
  "#d63384",
  "#2d6a4f",
  "#7048e8",
  "#087f8c",
  "#ae2012",
];

function formatLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();
}

export function MultiTrendChart({ series }: { series: ClusterManagerTrendSeries[] }) {
  const [hover, setHover] = useState<ChartTooltipState>(null);
  const allDates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();

  if (allDates.length === 0 || series.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>No comparison data in this range.</div>;
  }

  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.count)));
  const stepX = allDates.length > 1 ? (WIDTH - PADDING * 2) / (allDates.length - 1) : 0;

  function pointsFor(s: ClusterManagerTrendSeries) {
    const byDate = new Map(s.points.map((p) => [p.date, p.count]));
    return allDates.map((date, i) => {
      const x = PADDING + i * stepX;
      const count = byDate.get(date) ?? 0;
      const y = HEIGHT - PADDING - (count / max) * (HEIGHT - PADDING * 2);
      return { x, y, date, count };
    });
  }

  function pathFor(points: { x: number; y: number }[]): string {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }

  // Column hover: show one tooltip with every series' value at that date, not one-point-at-a-time.
  function showColumn(dateIndex: number, x: number) {
    const date = allDates[dateIndex]!;
    const rows = series.map((s, i) => {
      const point = s.points.find((p) => p.date === date);
      return { label: s.name, value: (point?.count ?? 0).toLocaleString(), color: SERIES_COLORS[i % SERIES_COLORS.length] };
    });
    setHover({ xPct: (x / WIDTH) * 100, yPx: PADDING, title: formatLabel(date), rows });
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Cluster Manager comparison over time">
          <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="var(--color-line)" strokeWidth={1} />
          {series.map((s, i) => {
            const points = pointsFor(s);
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            const last = points[points.length - 1];
            return (
              <g key={s.clusterManagerId}>
                <path d={pathFor(points)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, j) => (
                  <circle key={j} cx={p.x} cy={p.y} r={2.5} fill={color} style={{ pointerEvents: "none" }} />
                ))}
                {last && last.count > 0 && (
                  <text x={last.x + 4} y={last.y + 3} fontSize={9.5} fontWeight={700} fill={color}>
                    {last.count}
                  </text>
                )}
              </g>
            );
          })}
          {/* one invisible hit-column per date so hovering shows all series' values together */}
          {allDates.map((date, i) => {
            const x = PADDING + i * stepX;
            return (
              <rect
                key={date}
                x={x - stepX / 2}
                y={0}
                width={stepX || WIDTH}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => showColumn(i, x)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <ChartTooltip state={hover} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
        {series.map((s, i) => {
          const total = s.points.reduce((sum, p) => sum + p.count, 0);
          return (
            <div key={s.clusterManagerId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, maxWidth: 200 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: SERIES_COLORS[i % SERIES_COLORS.length], display: "inline-block", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.name}>
                {s.name}
              </span>
              <span style={{ fontWeight: 700, color: "var(--color-text)", flexShrink: 0 }}>{total.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
