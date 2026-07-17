"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_ITEMS, ROLE_OPTIONS } from "@posp-admin/contracts";
import { useAuth } from "../lib/auth/auth-context";
import { BrandMark } from "./BrandMark";
import { DashboardIcon, UsersIcon, RegistryIcon, PerformanceIcon, AnalyticsIcon, HealthIcon, LogoutIcon, MenuIcon, CloseIcon } from "./icons";

const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: DashboardIcon,
  users: UsersIcon,
  posp: RegistryIcon,
  performance: PerformanceIcon,
  analytics: AnalyticsIcon,
  "system-health": HealthIcon,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = MENU_ITEMS.filter((item) => user?.role && item.allowedRoles.includes(user.role));
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === user?.role)?.label ?? user?.role ?? "";

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="do-appshell-root">
      <header className="do-appshell-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="do-appshell-hamburger"
            aria-label="Open menu"
            style={{ background: "transparent", border: "none", color: "var(--color-primary-dark)", padding: 4 }}
          >
            <MenuIcon size={22} />
          </button>
          <BrandMark size={26} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>DigiSafe</div>
            <div style={{ fontSize: 10, color: "var(--color-text-subtle)", lineHeight: 1.1 }}>POSP Admin</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{user?.fullName}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-subtle)", lineHeight: 1.2 }}>{roleLabel}</div>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid var(--color-line)",
              color: "var(--color-text)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <LogoutIcon size={14} />
            Sign out
          </button>
        </div>
      </header>

      <div className="do-appshell-body">
        <aside className={`do-appshell-sidebar${drawerOpen ? " do-appshell-sidebar-open" : ""}`}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              onClick={() => setDrawerOpen(false)}
              className="do-appshell-drawer-close"
              aria-label="Close menu"
              style={{ background: "transparent", border: "none", color: "#fff", padding: 4 }}
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = NAV_ICONS[item.id];
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: active ? "rgba(255,255,255,0.14)" : "transparent",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  {Icon && <Icon size={16} />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {drawerOpen && <div className="do-appshell-backdrop" onClick={() => setDrawerOpen(false)} />}

        <main className="do-appshell-main">{children}</main>
      </div>
    </div>
  );
}
