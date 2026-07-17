"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RouteGuard } from "../../src/components/RouteGuard";
import { AppShell } from "../../src/components/AppShell";
import { StatusBadge } from "../../src/components/StatusBadge";
import { Avatar } from "../../src/components/Avatar";
import { useAuth } from "../../src/lib/auth/auth-context";
import { pospService } from "../../src/services/posp.service";
import { POSP_STATUS_OPTIONS } from "../../src/config/posp-status";
import { DEFAULT_PAGE_SIZE } from "../../src/config/constants";
import { formatDate } from "../../src/lib/format";
import type { PospListItem } from "../../src/types/posp";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PospListPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"]}>
      <AppShell>
        <Suspense fallback={null}>
          <PospListContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}

function PospListContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canFilterByClusterManager = user?.role === "ADMIN" || user?.role === "EXECUTIVE_MANAGER";

  const [items, setItems] = useState<PospListItem[]>([]);
  const [clusterManagers, setClusterManagers] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard stat cards deep-link here with ?status=... (and Cluster Manager pages might one day pass
  // ?clusterManagerId=...) — pick those up as the initial filter values instead of always starting blank.
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [clusterManagerId, setClusterManagerId] = useState(searchParams.get("clusterManagerId") ?? "");

  async function load(targetPage: number, limit = pageSize, statusOverride = status, clusterManagerOverride = clusterManagerId) {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await pospService.list({
        page: targetPage,
        limit,
        search: search || undefined,
        status: statusOverride || undefined,
        clusterManagerId: canFilterByClusterManager && clusterManagerOverride ? clusterManagerOverride : undefined,
      });
      setItems(data);
      setPage(meta.page);
      setTotalPages(meta.totalPages);
      setTotalCount(meta.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load POSPs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, pageSize, status, clusterManagerId);
    if (canFilterByClusterManager) {
      pospService.listClusterManagers().then(setClusterManagers).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load(1);
  }

  function changePageSize(size: number) {
    setPageSize(size);
    load(1, size);
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>POSP Registry</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 16 }}>{totalCount.toLocaleString()} total</p>

      <form onSubmit={applyFilters} style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search name, POSP ID, mobile, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
          {POSP_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {canFilterByClusterManager && (
          <select value={clusterManagerId} onChange={(e) => setClusterManagerId(e.target.value)} style={selectStyle}>
            <option value="">All cluster managers</option>
            {clusterManagers.map((cm) => (
              <option key={cm.id} value={cm.id}>
                {cm.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Apply
        </button>
      </form>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div className="do-posp-table-desktop" style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--color-primary-soft)", textAlign: "left" }}>
              <Th>POSP</Th>
              <Th>Mobile</Th>
              <Th>Email</Th>
              <Th>Cluster Manager</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  No POSPs found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar url={p.profilePic} name={p.fullName} size={36} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.fullName ?? "Unnamed POSP"}</div>
                        <div style={{ color: "var(--color-text-subtle)", fontSize: 11.5 }}>{p.pospId}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>{p.mobileNumber}</Td>
                  <Td>{p.emailAddress ?? "—"}</Td>
                  <Td>{p.clusterManager?.name ?? "Unassigned"}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>{formatDate(p.updatedAt)}</Td>
                  <Td>
                    <Link href={`/posps/${p.id}`} style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "underline", fontSize: 12.5 }}>
                      Review
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per POSP so every column is readable without horizontal scrolling. */}
      <div className="do-posp-cards-mobile">
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>No POSPs found.</div>
        ) : (
          items.map((p) => (
            <div key={p.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Avatar url={p.profilePic} name={p.fullName} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.fullName ?? "Unnamed POSP"}</div>
                  <div style={{ color: "var(--color-text-subtle)", fontSize: 11.5 }}>{p.pospId}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 10, fontSize: 12.5 }}>
                <span style={{ color: "var(--color-text-subtle)" }}>Mobile</span>
                <span>{p.mobileNumber}</span>
                <span style={{ color: "var(--color-text-subtle)" }}>Email</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.emailAddress ?? "—"}</span>
                <span style={{ color: "var(--color-text-subtle)" }}>Cluster Manager</span>
                <span>{p.clusterManager?.name ?? "Unassigned"}</span>
                <span style={{ color: "var(--color-text-subtle)" }}>Updated</span>
                <span>{formatDate(p.updatedAt)}</span>
              </div>
              <Link
                href={`/posps/${p.id}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 12,
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "1px solid var(--color-primary)",
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  fontSize: 12.5,
                  textDecoration: "none",
                }}
              >
                Review
              </Link>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--color-text-muted)" }}>Rows per page</span>
          <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))} style={selectStyle}>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => load(page - 1)} disabled={page <= 1} style={pageBtnStyle}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages} style={pageBtnStyle}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 14px" }}>{children}</td>;
}
const pageBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  fontWeight: 600,
};
const selectStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 };
