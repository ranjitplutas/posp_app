export const APP_ROLES = {
  ADMIN: "ADMIN",
  CLUSTER_MANAGER: "CLUSTER_MANAGER",
  EXECUTIVE_MANAGER: "EXECUTIVE_MANAGER",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "CLUSTER_MANAGER", label: "Cluster Manager" },
  { value: "EXECUTIVE_MANAGER", label: "Executive Manager" },
];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (Object.values(APP_ROLES) as string[]).includes(value);
}

export const USER_STATUSES = {
  PENDING_ROLE: "PENDING_ROLE",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === "string" && (Object.values(USER_STATUSES) as string[]).includes(value);
}
