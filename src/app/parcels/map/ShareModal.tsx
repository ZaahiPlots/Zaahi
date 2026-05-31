"use client";

// ZAAHI Vault — Share modal.
//
// Recipient picker (email / nickname) + permission selector + expiry.
// MVP: VIEW only. FEASIBILITY + OFFER are Phase 2.2.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.4.

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useEscapeClose } from "./useEscapeClose";

const GOLD = "#C8A96E";
// Unified panel bg (founder spec 2026-05-29).
const BG_DEEP = "rgba(0, 0, 0, 0.3)";
const BORDER = "rgba(255, 255, 255, 0.15)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  entryId: string;
  entryLabel: string; // e.g. "Plot 6457940 — Al Barari"
  onClose: () => void;
  onShared: () => void;
}

type Recipient =
  | { kind: "email"; value: string }
  | { kind: "nickname"; value: string };

type ExpiryChoice = "never" | "7d" | "30d";

export function ShareModal({ entryId, entryLabel, onClose, onShared }: Props) {
  const [recipientKind, setRecipientKind] = useState<"email" | "nickname">("nickname");
  const [recipientValue, setRecipientValue] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>("never");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeClose(onClose, !submitting);

  async function handleShare() {
    if (!recipientValue.trim()) {
      setError("Enter an email or nickname.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const recipient: Recipient = {
        kind: recipientKind,
        value: recipientValue.trim(),
      };
      let expiresAt: string | undefined = undefined;
      if (expiry === "7d") {
        expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
      } else if (expiry === "30d") {
        expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
      }
      const r = await apiFetch(`/api/me/vault/entries/${entryId}/shares`, {
        method: "POST",
        body: JSON.stringify({
          recipientLookup:
            recipient.kind === "email"
              ? { email: recipient.value }
              : { nickname: recipient.value },
          permission: "VIEW",
          ...(expiresAt ? { expiresAt } : {}),
        }),
      });
      if (r.status === 404) {
        setError("Recipient not found. Make sure they're an approved cohort member.");
        return;
      }
      if (r.status === 400) {
        setError("Cannot share with yourself.");
        return;
      }
      if (!r.ok) {
        setError(`Share failed (${r.status})`);
        return;
      }
      onShared();
      onClose();
    } catch (e) {
      console.error("[ShareModal] post:", e);
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div onClick={onClose} style={backdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={tinyLabelStyle}>Share</div>
            <h2 style={titleStyle}>{entryLabel}</h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">×</button>
        </div>

        <Field label="Recipient">
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => setRecipientKind("nickname")}
              style={togglePillStyle(recipientKind === "nickname")}
            >
              By nickname
            </button>
            <button
              onClick={() => setRecipientKind("email")}
              style={togglePillStyle(recipientKind === "email")}
            >
              By email
            </button>
          </div>
          <input
            type={recipientKind === "email" ? "email" : "text"}
            value={recipientValue}
            onChange={(e) => setRecipientValue(e.target.value)}
            placeholder={recipientKind === "email" ? "user@example.com" : "@aigerim"}
            style={inputStyle}
          />
        </Field>

        <Field label="Permission" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={radioLabelStyle(true)}>
              <input
                type="radio"
                checked
                readOnly
                style={radioInputStyle}
              />
              View only
            </label>
            <label style={radioLabelStyle(false)} title="Phase 2.2">
              <input type="radio" disabled style={radioInputStyle} />
              View + Feasibility (soon)
            </label>
          </div>
        </Field>

        <Field label="Expiry" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["never", "7d", "30d"] as ExpiryChoice[]).map((c) => (
              <button
                key={c}
                onClick={() => setExpiry(c)}
                style={togglePillStyle(expiry === c)}
              >
                {c === "never" ? "Never (revocable)" : c === "7d" ? "In 7 days" : "In 30 days"}
              </button>
            ))}
          </div>
        </Field>

        {error && <p style={errorStyle}>{error}</p>}

        <div style={actionRowStyle}>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={submitting}
            style={submitting ? buttonDisabledStyle : primaryButtonStyle}
          >
            {submitting ? "Sharing…" : "Send share"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginTop: 6, ...style }}>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

function togglePillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(200, 169, 110, 0.15)" : "rgba(255, 255, 255, 0.04)",
    border: `1px solid ${active ? GOLD : BORDER}`,
    color: active ? GOLD : TEXT_DIM,
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
  };
}

function radioLabelStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: active ? "rgba(200, 169, 110, 0.06)" : "rgba(255, 255, 255, 0.02)",
    border: `1px solid ${active ? "rgba(200, 169, 110, 0.3)" : BORDER}`,
    color: active ? TEXT_PRIMARY : TEXT_DIM,
    borderRadius: 6,
    fontSize: 12,
    cursor: active ? "pointer" : "not-allowed",
    opacity: active ? 1 : 0.55,
  };
}

const radioInputStyle: React.CSSProperties = { accentColor: GOLD };

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const panelStyle: React.CSSProperties = {
  background: BG_DEEP,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 22,
  maxWidth: 520,
  width: "100%",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
  marginTop: 2,
  letterSpacing: "-0.01em",
};

const tinyLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.8,
};

const closeButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
  borderRadius: 6,
  width: 30,
  height: 30,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TEXT_DIM,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: TEXT_PRIMARY,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const errorStyle: React.CSSProperties = {
  color: "#E63946",
  fontSize: 13,
  marginTop: 12,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  marginTop: 22,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.15)",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 150ms ease, border-color 150ms ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
};

const buttonDisabledStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};
