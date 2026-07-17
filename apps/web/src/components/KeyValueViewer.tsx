"use client";

import { useState } from "react";

const HIDDEN_KEY_MATCHES = new Set(["image", "filexmlcontent", "filepdfcontent", "xmlcontent", "pdfcontent"]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]/g, "");
}
function prettifyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function flattenEntries(data: Record<string, unknown>, prefix = ""): [string, unknown][] {
  const rows: [string, unknown][] = [];
  for (const [key, value] of Object.entries(data)) {
    const normalized = normalizeKey(key);
    if (HIDDEN_KEY_MATCHES.has(normalized)) continue;

    if (normalized === "address" && value !== null && typeof value === "object" && !Array.isArray(value)) {
      const combined = (value as Record<string, unknown>).combinedAddress;
      rows.push(["Address", combined ?? value]);
      continue;
    }

    const label = prefix ? `${prefix} ${prettifyKey(key)}` : prettifyKey(key);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...flattenEntries(value as Record<string, unknown>, label));
    } else {
      rows.push([label, value]);
    }
  }
  return rows;
}

function TruncatedText({ text, maxLength = 140 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) return <>{text}</>;
  return (
    <>
      {expanded ? text : `${text.slice(0, maxLength)}…`}{" "}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 12, fontWeight: 600, padding: 0 }}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </>
  );
}

export function KeyValueViewer({ data }: { data: string | null }) {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = data ? JSON.parse(data) : {};
  } catch {
    return <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{data}</div>;
  }

  const entries = flattenEntries(parsed);
  if (entries.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No extracted data available.</p>;
  }

  return (
    <div style={{ border: "1px solid var(--color-line)", borderRadius: 8, overflow: "hidden" }}>
      {entries.map(([label, value], i) => (
        <div key={`${label}-${i}`} style={{ padding: "10px 14px", borderTop: i === 0 ? "none" : "1px solid var(--color-line)" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, wordBreak: "break-word" }}>
            <TruncatedText text={formatValue(value)} />
          </div>
        </div>
      ))}
    </div>
  );
}
