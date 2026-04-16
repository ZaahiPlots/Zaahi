"use client";

// Full-application detail modal. Shows all form fields, transaction
// verification link, the 10-item onboarding checklist state, and status
// history (created → approved/rejected with timestamps + admin user id).
// PENDING applications get action buttons (Verify on Tronscan / Approve /
// Reject) that hand off to the parent page's confirm modals.

import type { AmbassadorApp } from "./page";
import { PLAN_PRICES_AED, type AmbassadorPlan } from "@/lib/ambassador-plans";

const GOLD = "#C8A96E";

// Same 10 keys the /join modal sends + the register route validates.
const CHECKLIST_LABELS: Record<string, string> = {
  understandUsdt: "Understands USDT TRC-20 payment",
  sentExactAmount: "Sent exact AED-equivalent amount",
  sentCorrectWallet: "Sent to correct ZAAHI wallet",
  hasTxHash: "Has transaction hash",
  readTerms: "Read ambassador terms",
  acceptCommission: "Accepts commission structure",
  acceptImmutability: "Accepts referral-code immutability",
  acceptSkipInactive: "Accepts skip-inactive policy",
  acceptPayoutSla: "Accepts 30-day payout SLA",
  acceptAntiFraud: "Accepts anti-fraud terms",
};

export function ApplicationDetailModal({
  app,
  onClose,
  onApprove,
  onReject,
}: {
  app: AmbassadorApp;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = app.status === "PENDING";
  const checklist = app.checklistData || {};
  const priceAed = PLAN_PRICES_AED[app.plan as AmbassadorPlan];

  return (
    <Backdrop onClose={onClose}>
      <div
        style={{
          width: "min(680px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "rgba(10, 22, 40, 0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 14,
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.5)",
          color: "rgba(255, 255, 255, 0.92)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "rgba(10, 22, 40, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Application
            </div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              {app.name}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.55)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px" }}>
          <Section title="Applicant">
            <Row k="Name" v={app.name} />
            <Row k="Email" v={app.email} mono />
            <Row k="Phone" v={app.phone} mono />
            {app.company && <Row k="Company" v={app.company} />}
            {app.experience && <Row k="Experience" v={app.experience} wrap />}
          </Section>

          <Section title="Payment">
            <Row k="Plan" v={app.plan} />
            <Row k="Amount" v={priceAed ? `${priceAed.toLocaleString("en-US")} AED` : "—"} />
            <Row k="TX hash" v={app.txHash} mono wrap />
            <div style={{ marginTop: 10 }}>
              <a
                href={`https://tronscan.org/#/transaction/${app.txHash}`}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  display: "inline-block",
                  padding: "8px 14px",
                  border: `1px solid ${GOLD}`,
                  borderRadius: 6,
                  color: GOLD,
                  textDecoration: "none",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  background: "rgba(200, 169, 110, 0.08)",
                }}
              >
                Verify on Tronscan ↗
              </a>
            </div>
          </Section>

          <Section title="Onboarding checklist">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 4 }}>
              {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                const checked = !!checklist[key];
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, padding: "3px 0" }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: checked ? "rgba(45, 106, 79, 0.3)" : "rgba(230, 57, 70, 0.15)", color: checked ? "#4ADE80" : "#F87171", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, border: `1px solid ${checked ? "#4ADE8050" : "#F8717140"}` }}>
                      {checked ? "✓" : "×"}
                    </span>
                    <span style={{ color: checked ? "rgba(255,255,255,0.85)" : "rgba(255, 255, 255, 0.5)" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Status history">
            <Row k="Submitted" v={formatDateTime(app.createdAt)} />
            <Row k="Current status" v={app.status} />
            {app.approvedAt && (
              <>
                <Row k="Approved at" v={formatDateTime(app.approvedAt)} />
                <Row k="Approved by" v={app.approvedBy || "—"} mono small />
              </>
            )}
            {app.referralCode && <Row k="Referral code" v={app.referralCode} mono />}
            {app.linkedUserId && <Row k="Linked user" v={app.linkedUserId} mono small />}
            {app.rejectedAt && (
              <>
                <Row k="Rejected at" v={formatDateTime(app.rejectedAt)} />
                <Row k="Rejected by" v={app.rejectedBy || "—"} mono small />
                {app.rejectionReason && <Row k="Reason" v={app.rejectionReason} wrap />}
              </>
            )}
          </Section>
        </div>

        {/* Actions */}
        {isPending && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "rgba(10, 22, 40, 0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              padding: "14px 20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <ActionButton onClick={onReject} variant="danger">Reject</ActionButton>
            <ActionButton onClick={onApprove} variant="primary">Approve</ActionButton>
          </div>
        )}
      </div>
    </Backdrop>
  );
}

// ── Shared modal helpers ─────────────────────────────────────────────

export function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
}) {
  const c =
    variant === "primary" ? { bg: "rgba(45, 106, 79, 0.85)", fg: "#FFFFFF", border: "rgba(45, 106, 79, 1)" } :
    variant === "danger" ? { bg: "rgba(230, 57, 70, 0.85)", fg: "#FFFFFF", border: "rgba(230, 57, 70, 1)" } :
    { bg: "transparent", fg: "rgba(255, 255, 255, 0.75)", border: "rgba(255, 255, 255, 0.2)" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 18px",
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: 8, padding: "10px 12px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v, mono, wrap, small }: { k: string; v: string; mono?: boolean; wrap?: boolean; small?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "4px 0", alignItems: wrap ? "flex-start" : "center" }}>
      <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.5)", width: 110, flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {k}
      </div>
      <div
        style={{
          fontSize: small ? 10 : 12,
          color: "rgba(255, 255, 255, 0.92)",
          fontFamily: mono ? '"SF Mono", Menlo, monospace' : "inherit",
          wordBreak: wrap ? "break-all" : "normal",
          whiteSpace: wrap ? "pre-wrap" : "nowrap",
          overflow: wrap ? "visible" : "hidden",
          textOverflow: wrap ? "clip" : "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {v}
      </div>
    </div>
  );
}

function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
