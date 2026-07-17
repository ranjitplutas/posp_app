"use client";

import { useState } from "react";

export function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginTop: 18 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: "var(--color-primary)",
          marginBottom: open ? 8 : 0,
        }}
      >
        <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▸</span>
        {title}
      </button>
      {open && children}
    </div>
  );
}
