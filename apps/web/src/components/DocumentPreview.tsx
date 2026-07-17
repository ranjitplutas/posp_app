"use client";

import { useState } from "react";

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
  return trimmed;
}

export function DocumentPreview({ url }: { url: string }) {
  const src = stripWrappingQuotes(url);
  const [zoom, setZoom] = useState(100);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-bg)",
          border: "1px solid var(--color-line)",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          padding: "6px 10px",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <span>{zoom}%</span>
        <div style={{ display: "flex", gap: 6 }}>
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
            −
          </IconButton>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
            +
          </IconButton>
          <a href={src} download style={{ display: "flex" }}>
            <IconButtonSpan label="Download">⬇</IconButtonSpan>
          </a>
          <a href={src} target="_blank" rel="noreferrer" style={{ display: "flex" }}>
            <IconButtonSpan label="Open full size">⤢</IconButtonSpan>
          </a>
        </div>
      </div>
      <div
        style={{
          border: "1px solid var(--color-line)",
          borderRadius: "0 0 8px 8px",
          overflow: "auto",
          maxHeight: 420,
          background: "#f3f4f6",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Document" style={{ width: `${zoom}%`, maxWidth: "none", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={iconBtnStyle}>
      {children}
    </button>
  );
}
function IconButtonSpan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span aria-label={label} title={label} style={iconBtnStyle}>
      {children}
    </span>
  );
}
const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  background: "var(--color-surface)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--color-text)",
};
