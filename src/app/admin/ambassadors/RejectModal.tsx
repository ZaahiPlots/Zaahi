"use client";

// Reject modal — dropdown of canned reasons + optional/required free-text.
// "Other" forces the textarea (required, min 10 chars). All other options
// auto-populate the textarea with the dropdown value as a starting point;
// admin can edit before submitting.

import { useMemo, useState } from "react";
import type { AmbassadorApp } from "./page";
import { Backdrop, ActionButton } from "./ApplicationDetailModal";

const GOLD = "#C8A96E";

const REASON_TYPES = [
  "Invalid transaction",
  "Duplicate application",
  "Insufficient information",
  "Does not meet criteria",
  "Other",
] as const;
type ReasonType = typeof REASON_TYPES[number];

export function RejectModal({
  app,
  onCancel,
  onConfirm,
}: {
  app: AmbassadorApp;
  onCancel: () => void;
  onConfirm: (reasonType: string, reasonText: string) => void;
}) {
  const [reasonType, setReasonType] = useState<ReasonType>("Invalid transaction");
  const [reasonText, setReasonText] = useState<string>("Invalid transaction");
  const [submitting, setSubmitting] = useState(false);

  const requiresText = reasonType === "Other";
  const textTrimmed = reasonText.trim();
  const isValid = requiresText
    ? textTrimmed.length >= 10
    : textTrimmed.length >= 1;

  const helper = useMemo(() => {
    if (requiresText && textTrimmed.length < 10) return "Please explain (at least 10 characters).";
    return "Email with this reason will be sent to the applicant.";
  }, [requiresText, textTrimmed.length]);

  function selectReason(next: ReasonType) {
    setReasonType(next);
    // Auto-populate textarea with the dropdown text as a starting point,
    // except for Other where we clear it and force input.
    setReasonText(next === "Other" ? "" : next);
  }

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      onConfirm(reasonType, textTrimmed);
    } finally {
      /* parent closes us */
    }
  }

  return (
    <Backdrop onClose={onCancel}>
      <div
        style={{
          width: "min(520px, calc(100vw - 32px))",
          background: "rgba(10, 22, 40, 0.9)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(200, 169, 110, 0.15)",
          borderRadius: 14,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          color: "rgba(255, 255, 255, 0.92)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Reject application
          </div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }}>
            {app.name} · {app.plan}
          </div>
        </div>

        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Reason type select */}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.55)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              Reason
            </span>
            <select
              value={reasonType}
              onChange={(e) => selectReason(e.target.value as ReasonType)}
              style={{
                padding: "9px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(200, 169, 110, 0.15)",
                borderRadius: 8,
                color: "rgba(255, 255, 255, 0.92)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                appearance: "none",
                cursor: "pointer",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}
            >
              {REASON_TYPES.map((r) => (
                <option key={r} value={r} style={{ background: "#0A1628", color: "#FFFFFF" }}>{r}</option>
              ))}
            </select>
          </label>

          {/* Free-text */}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.55)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
              Explanation {requiresText && <span style={{ color: "#F87171" }}>*</span>}
            </span>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={requiresText ? "Please explain the reason (min 10 chars)" : "Custom explanation (optional)"}
              rows={4}
              style={{
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(200, 169, 110, 0.15)",
                borderRadius: 8,
                color: "rgba(255, 255, 255, 0.92)",
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                lineHeight: 1.5,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}
            />
            <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.45)" }}>
              {helper}
            </span>
          </label>
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
          <ActionButton onClick={handleSubmit} variant="danger" disabled={!isValid || submitting}>
            {submitting ? "Rejecting…" : "Submit reject"}
          </ActionButton>
        </div>
      </div>
    </Backdrop>
  );
}
