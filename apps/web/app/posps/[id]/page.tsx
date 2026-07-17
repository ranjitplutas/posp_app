"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RouteGuard } from "../../../src/components/RouteGuard";
import { AppShell } from "../../../src/components/AppShell";
import { Modal } from "../../../src/components/Modal";
import { Tabs } from "../../../src/components/Tabs";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { Avatar } from "../../../src/components/Avatar";
import { VerificationTabContent } from "../../../src/components/VerificationTabContent";
import { InfoSection, InfoRow, BoolPill } from "../../../src/components/InfoSection";
import { SectionAccordion } from "../../../src/components/SectionAccordion";
import { useAuth } from "../../../src/lib/auth/auth-context";
import { useToast } from "../../../src/lib/toast/toast-context";
import { pospService } from "../../../src/services/posp.service";
import { formatDate } from "../../../src/lib/format";
import type { PospListItem, PospVerification } from "../../../src/types/posp";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  education: "Education",
  bank: "Bank Details",
  aadhar: "Aadhaar",
  pan_ocr: "PAN",
};

// bank/bank_verification and pan_ocr/pan_verification are two rows for the same
// underlying check — collapse each pair down to one tab, keeping whichever row
// was most recently updated (rather than showing two near-duplicate tabs).
const VERIFICATION_FAMILIES: Record<string, string> = {
  bank: "bank",
  bank_verification: "bank",
  pan_ocr: "pan_ocr",
  pan_verification: "pan_ocr",
};

function dedupeVerifications(verifications: PospVerification[]): PospVerification[] {
  const grouped = new Map<string, PospVerification[]>();
  const standalone: PospVerification[] = [];

  for (const v of verifications) {
    const family = VERIFICATION_FAMILIES[v.documentType];
    if (!family) {
      standalone.push(v);
      continue;
    }
    grouped.set(family, [...(grouped.get(family) ?? []), v]);
  }

  const latestOf = (list: PospVerification[]) =>
    list.reduce((best, v) => {
      const bestTime = best.dateUpdated ? new Date(best.dateUpdated).getTime() : 0;
      const vTime = v.dateUpdated ? new Date(v.dateUpdated).getTime() : 0;
      return vTime >= bestTime ? v : best;
    });

  return [...standalone, ...[...grouped.values()].map(latestOf)];
}

export default function PospDetailPage() {
  return (
    <RouteGuard allowedRoles={["ADMIN", "CLUSTER_MANAGER", "EXECUTIVE_MANAGER"]}>
      <AppShell>
        <PospDetailContent />
      </AppShell>
    </RouteGuard>
  );
}

function PospDetailContent() {
  const params = useParams<{ id: string }>();
  const pospId = Number(params.id);
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  // Cluster (re)assignment stays Admin/Executive-only; approve/reject is also open to the
  // Cluster Manager the POSP is assigned to (the backend independently enforces the scoping).
  const canAssignCluster = user?.role === "ADMIN" || user?.role === "EXECUTIVE_MANAGER";
  const canApproveReject = user?.role === "ADMIN" || user?.role === "EXECUTIVE_MANAGER" || user?.role === "CLUSTER_MANAGER";

  const [posp, setPosp] = useState<PospListItem | null>(null);
  const [verifications, setVerifications] = useState<PospVerification[]>([]);
  const [clusterManagers, setClusterManagers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingAssign, setPendingAssign] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pospData, verificationData] = await Promise.all([pospService.get(pospId), pospService.getVerification(pospId)]);
      setPosp(pospData);
      setVerifications(verificationData);
      if (canAssignCluster) {
        setClusterManagers(await pospService.listClusterManagers());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load POSP.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pospId]);

  async function confirmAssign() {
    if (!pendingAssign) return;
    setActionLoading(true);
    try {
      const updated = await pospService.assignClusterManager(pospId, pendingAssign.id || null);
      setPosp(updated);
      setPendingAssign(null);
      showSuccess(pendingAssign.id ? `Cluster Manager assigned to ${pendingAssign.name}.` : "Cluster Manager unassigned.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assign cluster manager.";
      setError(message);
      showError(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div style={{ color: "var(--color-text-muted)" }}>Loading…</div>;
  if (error && !posp) return <div style={{ color: "var(--color-red)" }}>{error}</div>;
  if (!posp) return null;

  // Sorted so Education leads (the tab most likely to need action), matching the reference layout.
  const tabOrder = ["education", "bank", "aadhar", "pan_ocr"];
  const dedupedVerifications = dedupeVerifications(verifications);
  const sortedVerifications = [...dedupedVerifications].sort(
    (a, b) => tabOrder.indexOf(VERIFICATION_FAMILIES[a.documentType] ?? a.documentType) - tabOrder.indexOf(VERIFICATION_FAMILIES[b.documentType] ?? b.documentType),
  );

  const tabs = sortedVerifications.map((v) => ({
    id: v.documentType,
    label: DOCUMENT_TYPE_LABELS[VERIFICATION_FAMILIES[v.documentType] ?? v.documentType] ?? v.documentType,
    content: (
      <VerificationTabContent
        verification={v}
        canManage={canApproveReject}
        onUpdate={(updated) => setVerifications((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))}
      />
    ),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link href="/posps" style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>
          ← Back to POSP list
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>Cluster Manager</span>
          {canAssignCluster ? (
            <select
              value={posp.clusterManagerId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                const cm = clusterManagers.find((c) => c.id === id);
                setPendingAssign({ id, name: cm?.name ?? "Unassigned" });
              }}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}
            >
              <option value="">Unassigned</option>
              {clusterManagers.map((cm) => (
                <option key={cm.id} value={cm.id}>
                  {cm.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600 }}>{posp.clusterManager?.name ?? "Unassigned"}</span>
          )}
        </div>
      </div>

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Desktop/tablet: profile card + tabbed verification panel side by side. */}
      <div className="do-posp-detail-grid do-posp-detail-desktop">
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 20 }}>
            <Avatar url={posp.profilePic} name={posp.fullName} size={96} />
            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 12 }}>{posp.fullName ?? "Unnamed POSP"}</div>
            <div style={{ color: "var(--color-text-subtle)", fontSize: 12.5, marginBottom: 8 }}>{posp.pospId}</div>
            <StatusBadge status={posp.status} />
          </div>

          <InfoSection title="ACCOUNT">
            <InfoRow label="Created At" value={formatDate(posp.createdAt)} />
            <InfoRow label="Last Updated" value={formatDate(posp.updatedAt)} />
            <InfoRow label="Is Active" value={<BoolPill value={posp.isActive === "Active"} />} />
            <InfoRow label="Ready to Process" value={<BoolPill value={posp.readyToProcess} />} />
            <InfoRow label="Is Synced" value={<BoolPill value={posp.isSynced} />} />
          </InfoSection>

          <InfoSection title="CONTACT">
            <InfoRow label="Mobile" value={posp.mobileNumber} />
            <InfoRow label="Email" value={<span style={{ wordBreak: "break-all" }}>{posp.emailAddress ?? "—"}</span>} />
          </InfoSection>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: 20 }}>
          {tabs.length === 0 ? <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No verification records.</div> : <Tabs tabs={tabs} />}
        </div>
      </div>

      {/* Mobile: everything as single-open accordion sections, Profile expanded by default. */}
      <div className="do-posp-detail-mobile">
        <SectionAccordion
          defaultOpenId="profile"
          sections={[
            {
              id: "profile",
              label: "Profile",
              content: (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 16 }}>
                    <Avatar url={posp.profilePic} name={posp.fullName} size={88} />
                    <div style={{ fontWeight: 800, fontSize: 16, marginTop: 12 }}>{posp.fullName ?? "Unnamed POSP"}</div>
                    <div style={{ color: "var(--color-text-subtle)", fontSize: 12.5, marginBottom: 8 }}>{posp.pospId}</div>
                    <StatusBadge status={posp.status} />
                  </div>
                  <InfoSection title="ACCOUNT">
                    <InfoRow label="Created At" value={formatDate(posp.createdAt)} />
                    <InfoRow label="Last Updated" value={formatDate(posp.updatedAt)} />
                    <InfoRow label="Is Active" value={<BoolPill value={posp.isActive === "Active"} />} />
                    <InfoRow label="Ready to Process" value={<BoolPill value={posp.readyToProcess} />} />
                    <InfoRow label="Is Synced" value={<BoolPill value={posp.isSynced} />} />
                  </InfoSection>
                  <InfoSection title="CONTACT">
                    <InfoRow label="Mobile" value={posp.mobileNumber} />
                    <InfoRow label="Email" value={<span style={{ wordBreak: "break-all" }}>{posp.emailAddress ?? "—"}</span>} />
                  </InfoSection>
                </div>
              ),
            },
            ...tabs.map((t) => ({ id: t.id, label: t.label, content: t.content })),
          ]}
        />
      </div>

      {pendingAssign && (
        <Modal
          title="Assign cluster manager"
          onCancel={() => setPendingAssign(null)}
          onConfirm={confirmAssign}
          loading={actionLoading}
          confirmLabel={pendingAssign.id ? "Yes, assign" : "Yes, unassign"}
        >
          {pendingAssign.id ? `Assign this POSP to ${pendingAssign.name}?` : "Remove the assigned cluster manager from this POSP?"}
        </Modal>
      )}
    </div>
  );
}
