"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@posp-admin/contracts";
import { useAuth } from "../lib/auth/auth-context";
import { ROUTES } from "../config/constants";

/**
 * Wraps a protected page. Redirects based on AuthState before rendering
 * children — the backend independently re-enforces every one of these rules
 * on its own APIs, this is purely the UX layer (never the security boundary).
 */
export function RouteGuard({ allowedRoles, children }: { allowedRoles: AppRole[]; children: React.ReactNode }) {
  const { state, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state === "UNAUTHENTICATED") {
      router.replace(ROUTES.LOGIN);
    } else if (state === "PENDING_ROLE") {
      router.replace(ROUTES.ACCESS_PENDING);
    } else if (state === "DISABLED") {
      router.replace(ROUTES.ACCOUNT_DISABLED);
    } else if (state === "APP_AUTHENTICATED" && user && !allowedRoles.includes(user.role as AppRole)) {
      router.replace(ROUTES.ACCESS_DENIED);
    }
  }, [state, user, allowedRoles, router]);

  if (state === "INITIALIZING") {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (state === "APP_AUTHENTICATED" && user && allowedRoles.includes(user.role as AppRole)) {
    return <>{children}</>;
  }

  return null;
}
