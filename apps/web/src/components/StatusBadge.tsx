import { POSP_STATUS_COLORS, POSP_STATUS_LABELS } from "../config/posp-status";

export function StatusBadge({ status, className }: { status: number; className?: string }) {
  const color = POSP_STATUS_COLORS[status] ?? { bg: "#eee", fg: "#555" };
  const label = POSP_STATUS_LABELS[status] ?? `Status ${status}`;
  return (
    <span
      className={className}
      style={{ background: color.bg, color: color.fg, padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}
    >
      {label}
    </span>
  );
}
