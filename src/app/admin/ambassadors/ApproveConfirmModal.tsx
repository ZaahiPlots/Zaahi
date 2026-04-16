"use client";

// Approve confirmation — shows a checklist of what happens so admin
// knows exactly what they're triggering before a one-way action.

import { useState } from "react";
import type { AmbassadorApp } from "./page";
import { Backdrop, ActionButton } from "./ApplicationDetailModal";

const GOLD = "#C8A96E";

export function ApproveConfirmModal({
  app,
  onCancel,
  onConfirm,
}: {
  app: AmbassadorApp;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try { onConfirm(); } finally { /* parent closes us */ }
  }

  return (
    <Backdrop onClose={onCancel}>
      <div
        style={{
          width: "min(480px, calc(100vw - 32px))",
          background: "rgba(10, 22, 40, 0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 14,
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.5)",
          color: "rgba(255, 255, 255, 0.92)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Confirm approval
          </div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }}>
            Approve {app.name} for{" "}
            <span style={{ color: GOLD }}>{app.plan}</span> tier?
          </div>
        </div>

        <div style={{ padding: "16px 22px" }}>
          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            This will:
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <Step>Flip application status → <b style={{ color: GOLD }}>APPROVED</b></Step>
            <Step>Generate a unique 8-char referral code</Step>
            <Step>Send welcome email to <span style={{ fontFamily: '"SF Mono", Menlo, monospace', fontSize: 11 }}>{app.email}</span></Step>
            <Step>Post notification to admin Telegram</Step>
            <Step small>On first login with this email, user gets <code>ambassadorActive=true</code> and status moves to <b>ACTIVE</b></Step>
          </ul>
        </div>

        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            background: "rgba(0, 0, 0, 0.15)",
          }}
        >
          <ActionButton onClick={onCancel} disabled={submitting}>Cancel</ActionButton>
          <ActionButton onClick={handleConfirm} variant="primary" disabled={submitting}>
            {submitting ? "Approving…" : "Confirm approve"}
          </ActionButton>
        </div>
      </div>
    </Backdrop>
  );
}

function Step({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: small ? 11 : 12, color: small ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.85)", lineHeight: 1.5 }}>
      <span style={{ color: GOLD, marginTop: 2 }}>◆</span>
      <span style={{ flex: 1 }}>{children}</span>
    </li>
  );
}
