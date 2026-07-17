"use client";

import Link from "next/link";

export function StatCard({
  label,
  value,
  topColor,
  icon,
  iconBg,
  subtext,
  href,
}: {
  label: string;
  value: string | number;
  topColor: string;
  icon: React.ReactNode;
  iconBg: string;
  subtext?: string;
  /** When set, the whole card links out (e.g. to the POSP registry pre-filtered by this card's status). */
  href?: string;
}) {
  const content = (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderTop: `3px solid ${topColor}`,
        borderRadius: 10,
        padding: "16px 18px",
        cursor: href ? "pointer" : undefined,
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
      className={href ? "do-stat-card-clickable" : undefined}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-text-subtle)" }}>{label}</div>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: iconBg, color: topColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-display)" }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: "var(--color-accent-dark)", marginTop: 4, fontWeight: 600 }}>{subtext}</div>}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {content}
    </Link>
  );
}
