export function AccessDeniedIllustration() {
  return (
    <div style={{ position: "relative", width: 220, height: 200, margin: "0 auto 4px" }}>
      {/* soft outer glow, breathing */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 170,
          height: 170,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--color-red-soft) 0%, transparent 70%)",
          animation: "glow-breathe 3.2s ease-in-out infinite",
        }}
      />

      {/* fading concentric rings */}
      {[0, 0.8, 1.6].map((delay, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 96 + i * 28,
            height: 96 + i * 28,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "1.5px solid var(--color-red)",
            animation: `ring-fade 2.8s ease-out infinite ${delay}s`,
          }}
        />
      ))}

      {/* orbiting dots */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 148,
          height: 148,
          transform: "translate(-50%, -50%)",
          animation: "orbit-spin 9s linear infinite",
        }}
      >
        <span style={{ position: "absolute", top: 0, left: "50%", width: 6, height: 6, borderRadius: "50%", background: "var(--color-red)", opacity: 0.55 }} />
        <span style={{ position: "absolute", bottom: 8, right: 6, width: 5, height: 5, borderRadius: "50%", background: "var(--color-primary-soft)" }} />
        <span style={{ position: "absolute", top: 30, left: 0, width: 4, height: 4, borderRadius: "50%", background: "var(--color-red)", opacity: 0.4 }} />
      </div>

      {/* scattered ornamental shapes */}
      <span style={{ position: "absolute", top: 8, left: 14, width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary-soft)", animation: "float-bob 3.6s ease-in-out infinite" }} />
      <span style={{ position: "absolute", bottom: 14, left: 4, width: 7, height: 7, borderRadius: "50%", border: "2px solid var(--color-red)", opacity: 0.5, animation: "float-bob 4.2s ease-in-out infinite 0.4s" }} />
      <span style={{ position: "absolute", top: 2, right: 54, width: 9, height: 9, background: "var(--color-primary-soft)", opacity: 0.5, transform: "rotate(20deg)" }} />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "shield-shake 3.6s ease-in-out infinite",
          transformOrigin: "50% 15%",
        }}
      >
        <svg width="96" height="102" viewBox="0 0 64 70" aria-hidden="true" style={{ animation: "shield-pulse 2.8s ease-in-out infinite", filter: "drop-shadow(0 6px 14px rgba(192,57,43,0.28))" }}>
          <defs>
            <linearGradient id="shield-fill-denied" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-surface)" />
              <stop offset="100%" stopColor="var(--color-red-soft)" />
            </linearGradient>
          </defs>
          <path d="M32 3C41 8 49 9 58 9V34C58 49 48 61 32 68C16 61 6 49 6 34V9C15 9 23 8 32 3Z" fill="url(#shield-fill-denied)" stroke="var(--color-red)" strokeWidth="1.5" />
          <path d="M32 3C41 8 49 9 58 9V34C58 49 48 61 32 68V3Z" fill="var(--color-red)" opacity="0.14" />
          {/* glass highlight */}
          <path d="M14 11C20 9.5 26 8 32 5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

          <g style={{ animation: "lock-drop 0.6s ease-out" }}>
            <rect x="24" y="33" width="16" height="13" rx="2.5" fill="var(--color-red)" />
            <path d="M27 33v-4a5 5 0 0110 0v4" fill="none" stroke="var(--color-red)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="39" r="1.8" fill="var(--color-red-soft)" />
          </g>
        </svg>

        {/* "denied" badge */}
        <div
          style={{
            position: "absolute",
            top: 4,
            right: -6,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--color-red)",
            border: "3px solid var(--color-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "badge-pop 0.5s ease-out 0.3s both",
            boxShadow: "0 3px 8px rgba(192,57,43,0.35)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </div>
      </div>
    </div>
  );
}
