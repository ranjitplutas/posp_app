"use client";

export type ChartTooltipState = { xPct: number; yPx: number; title: string; rows: { label: string; value: string; color?: string }[] } | null;

/** Floating card tooltip positioned over an SVG chart's hovered point/bar/slice — replaces the plain native `<title>` tooltip with a styled one. Parent chart owns the hover state and passes it in. */
export function ChartTooltip({ state }: { state: ChartTooltipState }) {
  if (!state) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: `${state.xPct}%`,
        top: state.yPx,
        transform: "translate(-50%, -100%) translateY(-10px)",
        pointerEvents: "none",
        background: "var(--color-primary-dark)",
        color: "#fff",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 11.5,
        lineHeight: 1.5,
        boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
        whiteSpace: "nowrap",
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: state.rows.length ? 2 : 0 }}>{state.title}</div>
      {state.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {r.color && <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, display: "inline-block", flexShrink: 0 }} />}
          <span style={{ opacity: 0.85 }}>{r.label}</span>
          <span style={{ fontWeight: 700, marginLeft: "auto" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
