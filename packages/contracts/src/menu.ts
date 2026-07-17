import type { AppRole } from "./roles.js";

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  allowedRoles: AppRole[];
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    allowedRoles: ["ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"],
  },
  {
    id: "users",
    label: "User Management",
    href: "/admin/users",
    allowedRoles: ["ADMIN"],
  },
  {
    id: "posp",
    label: "POSP Registry",
    href: "/posps",
    allowedRoles: ["ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"],
  },
  {
    id: "performance",
    label: "Performance",
    href: "/performance",
    allowedRoles: ["ADMIN", "EXECUTIVE_MANAGER"],
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/analytics",
    allowedRoles: ["ADMIN", "EXECUTIVE_MANAGER"],
  },
  {
    id: "system-health",
    label: "System Health",
    href: "/system-health",
    allowedRoles: ["ADMIN"],
  },
];
