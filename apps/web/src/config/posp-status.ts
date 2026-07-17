/** digi_user.status enum, as used by the original posp_app — -1..3. */
export const POSP_STATUS_LABELS: Record<number, string> = {
  [-1]: "Rejected",
  0: "In Progress",
  1: "In Approval",
  2: "Approved",
  3: "Completed",
};

export const POSP_STATUS_COLORS: Record<number, { bg: string; fg: string }> = {
  [-1]: { bg: "var(--color-red-soft)", fg: "var(--color-red)" },
  0: { bg: "#eef1f3", fg: "var(--color-text-muted)" },
  1: { bg: "var(--color-amber-soft)", fg: "var(--color-amber)" },
  2: { bg: "var(--color-accent-soft)", fg: "var(--color-accent-dark)" },
  3: { bg: "var(--color-primary-soft)", fg: "var(--color-primary-dark)" },
};

export const POSP_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "-1", label: "Rejected" },
  { value: "0", label: "In Progress" },
  { value: "1", label: "In Approval" },
  { value: "2", label: "Approved" },
  { value: "3", label: "Completed" },
  { value: "2,3", label: "Onboarded (Approved + Completed)" },
];
