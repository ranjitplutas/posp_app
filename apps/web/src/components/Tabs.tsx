"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  if (!activeTab) return null;

  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          background: "var(--color-primary-soft)",
          borderRadius: 999,
          padding: 4,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTab.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                padding: "7px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                borderRadius: 999,
                border: "none",
                background: isActive ? "var(--color-primary-dark)" : "transparent",
                color: isActive ? "#fff" : "var(--color-primary-dark)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>{activeTab.content}</div>
    </div>
  );
}
