"use client";

export function Modal({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  loading = false,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 30, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div style={{ background: "var(--color-surface)", borderRadius: 10, padding: 24, width: 380 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>{title}</h2>
        <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", marginBottom: 20 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: 13, fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 600 }}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
