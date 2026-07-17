"use client";

import { useState } from "react";
import { KeyValueViewer } from "./KeyValueViewer";
import { Modal } from "./Modal";
import { DocumentPreview } from "./DocumentPreview";
import { Accordion } from "./Accordion";
import { BoolPill, InfoRow } from "./InfoSection";
import { pospService } from "../services/posp.service";
import { useToast } from "../lib/toast/toast-context";
import { formatDate } from "../lib/format";
import type { PospVerification } from "../types/posp";

const HIDE_RAW_DATA_FOR = new Set(["pan_ocr", "education"]);
const SHOW_DOCUMENT_PREVIEW_FOR = new Set(["education"]);
const SHOW_REMARKS_BANNER_FOR = new Set(["education"]);
const SHOW_APPROVE_REJECT_FOR = new Set(["education"]);

const VERIFICATION_LABEL: Record<string, string> = {
  pan_ocr: "PAN verification",
  aadhar: "Aadhaar verification",
  bank: "Bank account verification",
  education: "Education verification",
  pan_verification: "PAN verification",
  bank_verification: "Bank account verification",
};

export function VerificationTabContent({
  verification,
  canManage,
  onUpdate,
}: {
  verification: PospVerification;
  canManage: boolean;
  onUpdate: (updated: PospVerification) => void;
}) {
  const v = verification;
  const { showSuccess, showError } = useToast();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hideRawData = HIDE_RAW_DATA_FOR.has(v.documentType);
  const showPreview = SHOW_DOCUMENT_PREVIEW_FOR.has(v.documentType) && Boolean(v.filePath);
  const showRemarksBanner = SHOW_REMARKS_BANNER_FOR.has(v.documentType) && Boolean(v.remarks);
  // Once verified, the decision is made — approve/reject only makes sense while still pending.
  const showApproveReject = SHOW_APPROVE_REJECT_FOR.has(v.documentType) && canManage && !v.isVerified;
  const label = VERIFICATION_LABEL[v.documentType] ?? v.documentType.replace(/_/g, " ");
  const isEducation = v.documentType === "education";

  async function submitDecision() {
    if (!confirming) return;
    setLoading(true);
    setError(null);
    try {
      let updated = await pospService.updateVerificationField(v.pospId, v.id, "isVerified", confirming === "approve");
      if (confirming === "reject" && remarks.trim()) {
        updated = await pospService.updateVerificationField(v.pospId, v.id, "remarks", remarks.trim());
      }
      onUpdate(updated);
      setConfirming(null);
      setRemarks("");
      showSuccess(confirming === "approve" ? `${label} approved.` : `${label} rejected.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update.";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }

  const detailsColumn = (
    <div>
      <div style={{ border: "1px solid var(--color-line)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "var(--color-bg)", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-text-subtle)" }}>
          DETAILS
        </div>
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <InfoRow
            label="Status"
            value={
              <span
                style={{
                  background: v.isVerified ? "var(--color-accent-soft)" : "var(--color-amber-soft)",
                  color: v.isVerified ? "var(--color-accent-dark)" : "var(--color-amber)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {v.isVerified ? "VERIFIED" : "PENDING"}
              </span>
            }
          />
          <InfoRow label={isEducation ? "Qualification" : "Value"} value={v.valueLabel ?? v.value ?? "—"} />
          <InfoRow label="Auto-Verified" value={<BoolPill value={v.isVerified} />} />
          <InfoRow label="Last Updated" value={formatDate(v.dateUpdated)} />
        </div>
      </div>

      {showApproveReject && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={() => setConfirming("approve")}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--color-primary-dark)", color: "#fff", fontWeight: 700, fontSize: 13.5 }}
          >
            ✓ Approve Education
          </button>
          <button
            onClick={() => setConfirming("reject")}
            style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--color-red)", color: "#fff", fontWeight: 700, fontSize: 13.5 }}
          >
            ✕ Reject Education
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div
        style={{
          background: v.isVerified ? "var(--color-accent-soft)" : "var(--color-red-soft)",
          color: v.isVerified ? "var(--color-accent-dark)" : "var(--color-red)",
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: 13.5,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        {label} {v.isVerified ? "successful" : "not verified"}
      </div>

      {showRemarksBanner && (
        <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          Remarks: {v.remarks}
        </div>
      )}

      {showPreview ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--color-text-subtle)", marginBottom: 8 }}>DOCUMENT PREVIEW</div>
            <DocumentPreview url={v.filePath!} />
          </div>
          {detailsColumn}
        </div>
      ) : (
        detailsColumn
      )}

      {!hideRawData && (
        <Accordion title="SEE EXTRACTED DATA">
          <KeyValueViewer data={v.data} />
        </Accordion>
      )}

      {error && <div style={{ background: "var(--color-red-soft)", color: "var(--color-red)", padding: "10px 12px", borderRadius: 8, marginTop: 16, fontSize: 13 }}>{error}</div>}

      {confirming && (
        <Modal
          title={confirming === "approve" ? "Approve education verification" : "Reject education verification"}
          onCancel={() => {
            setConfirming(null);
            setRemarks("");
          }}
          onConfirm={submitDecision}
          loading={loading}
          confirmLabel={confirming === "approve" ? "Yes, approve" : "Yes, reject"}
        >
          {confirming === "approve" ? (
            "This will mark the education verification as verified."
          ) : (
            <div>
              <p style={{ margin: "0 0 10px" }}>This will mark the education verification as not verified.</p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks"
                rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 13 }}
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
