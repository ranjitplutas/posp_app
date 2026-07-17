"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../../src/lib/auth/auth-context";
import { ROUTES } from "../../src/config/constants";
import { BrandMark } from "../../src/components/BrandMark";

export default function LoginPage() {
  const { state, user, error, login, loginWithPassword } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (state === "APP_AUTHENTICATED") router.replace(ROUTES.DASHBOARD);
    else if (state === "PENDING_ROLE") router.replace(ROUTES.ACCESS_PENDING);
    else if (state === "DISABLED") router.replace(ROUTES.ACCOUNT_DISABLED);
  }, [state, router]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      await loginWithPassword(username, password);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.2fr 0.8fr" }} className="do-login-grid">
      <section style={{ position: "relative", minHeight: 340 }}>
        <Image src="/images/login-hero.jpg" alt="A DigiSafe POSP partner in rural India" fill priority style={{ objectFit: "cover" }} sizes="60vw" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(7,59,88,0.35) 0%, rgba(7,59,88,0.75) 100%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, padding: "36px 40px" }}>
          <BrandMark size={38} />
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>DigiSafe</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>POSP Operations</div>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, padding: "0 40px", marginTop: "35vh", maxWidth: 480 }}>
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
            Trusted people.
            <br />
            <span style={{ color: "#c9e6a8" }}>Protected communities.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 16 }}>
            Role-based operations · Verified onboarding · Admin panel v2
          </p>
        </div>
      </section>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: "var(--color-surface)" }}>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>Welcome back.</h2>
          <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", margin: "0 0 24px" }}>Sign in to access the DigiSafe POSP workspace.</p>

          {error && <ErrorBox>{error}</ErrorBox>}

          <button
            onClick={login}
            disabled={state === "INITIALIZING"}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontWeight: 600,
              fontSize: 14,
              opacity: state === "INITIALIZING" ? 0.6 : 1,
            }}
          >
            <MicrosoftLogo />
            Sign in with Microsoft
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
            <span style={{ fontSize: 11.5, color: "var(--color-text-subtle)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              or sign in with username
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
          </div>

          {passwordError && <ErrorBox>{passwordError}</ErrorBox>}

          <form onSubmit={handlePasswordSubmit}>
            <Field label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required style={inputStyle} />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required style={inputStyle} />
            </Field>

            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--color-primary)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                opacity: passwordLoading ? 0.7 : 1,
              }}
            >
              {passwordLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div style={{ fontSize: 11.5, color: "var(--color-text-subtle)", marginTop: 20, lineHeight: 1.5 }}>
            Microsoft sign-in is the primary path. The username/password form is a local testing fallback and will be removed once SSO is confirmed working.
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: "var(--color-text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", fontSize: 13, padding: "10px 12px", borderRadius: 8, marginBottom: 16 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 7,
  border: "1px solid var(--color-line)",
  fontSize: 13.5,
};

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
