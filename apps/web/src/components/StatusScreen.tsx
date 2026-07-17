"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../config/constants";

export function StatusScreen({
  title,
  message,
  tone = "neutral",
  onLogout,
  illustration,
}: {
  title: string;
  message: string;
  tone?: "neutral" | "danger";
  onLogout?: () => Promise<void>;
  illustration?: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (!onLogout) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      // logout() clears local auth state but doesn't navigate anywhere itself —
      // this page has no RouteGuard watching that state, so without this the
      // button appeared to do nothing.
      router.replace(ROUTES.LOGIN);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 12,
          padding: "36px 32px",
          width: 440,
          textAlign: "center",
        }}
      >
        {illustration && <div style={{ marginBottom: 8 }}>{illustration}</div>}
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 10px",
            color: tone === "danger" ? "var(--color-red)" : "var(--color-primary)",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5, margin: "0 0 24px" }}>{message}</p>
        {onLogout && (
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              background: "var(--color-surface)",
              fontWeight: 600,
              fontSize: 13.5,
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        )}
      </div>
    </div>
  );
}
