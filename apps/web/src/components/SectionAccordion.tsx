"use client";

import { useState } from "react";

export type AccordionSection = { id: string; label: string; content: React.ReactNode; badge?: React.ReactNode };

/** Single-open-at-a-time accordion of full page sections (e.g. Profile / Education / Bank / PAN / Aadhaar on mobile). */
export function SectionAccordion({ sections, defaultOpenId }: { sections: AccordionSection[]; defaultOpenId?: string }) {
  const [openId, setOpenId] = useState<string | undefined>(defaultOpenId ?? sections[0]?.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map((s) => {
        const isOpen = s.id === openId;
        return (
          <div key={s.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setOpenId(isOpen ? undefined : s.id)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                textAlign: "left",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {s.label}
                {s.badge}
              </span>
              <span
                style={{
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  color: "var(--color-text-subtle)",
                  fontSize: 12,
                }}
              >
                ▼
              </span>
            </button>
            {isOpen && <div style={{ padding: "0 16px 18px" }}>{s.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
