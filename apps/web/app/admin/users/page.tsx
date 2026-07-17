"use client";

import { useEffect, useState } from "react";
import { RouteGuard } from "../../../src/components/RouteGuard";
import { AppShell } from "../../../src/components/AppShell";
import { Modal } from "../../../src/components/Modal";
import { usersService } from "../../../src/services/users.service";
import type { AdminUser } from "../../../src/types/users";
import type { AppRole, UserStatus } from "@posp-admin/contracts";
import { ROLE_OPTIONS } from "@posp-admin/contracts";

export default function AdminUsersPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN"]}>
      <AppShell>
        <UsersContent />
      </AppShell>
    </RouteGuard>
  );
}

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING_ROLE: "Pending Role",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

function UsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUser; role: AppRole } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ user: AdminUser; status: UserStatus } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadFirstPage() {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await usersService.list({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data);
      setNextCursor(meta.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const { data, meta } = await usersService.list({
        cursor: nextCursor,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers((prev) => [...prev, ...data]);
      setNextCursor(meta.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more users.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    loadFirstPage();
  }

  function updateRow(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    setActionLoading(true);
    try {
      const updated = await usersService.assignRole(pendingRoleChange.user.id, pendingRoleChange.role);
      updateRow(updated);
      setPendingRoleChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return;
    setActionLoading(true);
    try {
      const updated = await usersService.setStatus(pendingStatusChange.user.id, pendingStatusChange.status);
      updateRow(updated);
      setPendingStatusChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>User Management</h1>

      <form onSubmit={applyFilters} className="do-users-filter-form" style={{ marginBottom: 16 }}>
        <input
          placeholder="Search email or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}
        />
        <div className="do-users-filter-row2" style={{ display: "flex", gap: 10 }}>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as AppRole | "")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | "")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
            Apply
          </button>
        </div>
      </form>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--color-primary-soft)", textAlign: "left" }}>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last Login</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <Td>{u.fullName}</Td>
                  <Td>{u.email}</Td>
                  <Td>
                    <select
                      value={u.role ?? ""}
                      onChange={(e) => {
                        const role = e.target.value as AppRole;
                        if (role) setPendingRoleChange({ user: u, role });
                      }}
                      style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 12.5 }}
                    >
                      <option value="" disabled>
                        Assign role…
                      </option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <StatusPill status={u.status} />
                  </Td>
                  <Td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</Td>
                  <Td>
                    {u.status === "ACTIVE" && (
                      <button onClick={() => setPendingStatusChange({ user: u, status: "DISABLED" })} style={actionBtnStyle}>
                        Disable
                      </button>
                    )}
                    {u.status === "DISABLED" && (
                      <button onClick={() => setPendingStatusChange({ user: u, status: "ACTIVE" })} style={actionBtnStyle}>
                        Enable
                      </button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid var(--color-line)", background: "var(--color-surface)", fontSize: 13, fontWeight: 600 }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {pendingRoleChange && (
        <Modal
          title="Assign role"
          onCancel={() => setPendingRoleChange(null)}
          onConfirm={confirmRoleChange}
          loading={actionLoading}
          confirmLabel="Yes, assign"
        >
          Assign <strong>{ROLE_OPTIONS.find((r) => r.value === pendingRoleChange.role)?.label}</strong> to{" "}
          <strong>{pendingRoleChange.user.fullName}</strong>? This will also activate their account.
        </Modal>
      )}

      {pendingStatusChange && (
        <Modal
          title={pendingStatusChange.status === "DISABLED" ? "Disable user" : "Enable user"}
          onCancel={() => setPendingStatusChange(null)}
          onConfirm={confirmStatusChange}
          loading={actionLoading}
          confirmLabel={pendingStatusChange.status === "DISABLED" ? "Yes, disable" : "Yes, enable"}
        >
          {pendingStatusChange.status === "DISABLED"
            ? `${pendingStatusChange.user.fullName} will lose access immediately.`
            : `${pendingStatusChange.user.fullName} will regain access with their existing role.`}
        </Modal>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--color-primary-dark)" }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 14px" }}>{children}</td>;
}

const actionBtnStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  fontSize: 12,
  fontWeight: 600,
};

function StatusPill({ status }: { status: UserStatus }) {
  const colors: Record<UserStatus, { bg: string; fg: string }> = {
    ACTIVE: { bg: "var(--color-accent-soft)", fg: "var(--color-accent-dark)" },
    PENDING_ROLE: { bg: "var(--color-amber-soft)", fg: "var(--color-amber)" },
    DISABLED: { bg: "var(--color-red-soft)", fg: "var(--color-red)" },
  };
  const c = colors[status];
  return (
    <span style={{ background: c.bg, color: c.fg, padding: "3px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
      {STATUS_LABEL[status]}
    </span>
  );
}
