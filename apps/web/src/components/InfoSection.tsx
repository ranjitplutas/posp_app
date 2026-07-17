export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-text-subtle)", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function BoolPill({ value }: { value: boolean }) {
  return (
    <span
      style={{
        background: value ? "var(--color-accent-soft)" : "#eef1f3",
        color: value ? "var(--color-accent-dark)" : "var(--color-text-muted)",
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {value ? "YES" : "NO"}
    </span>
  );
}
