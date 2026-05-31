"use client";

// ZAAHI Vault — Upload Wizard Step 2: broker's own data.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.1.

import { useState } from "react";
import {
  VAULT_STAGE_LABELS,
  type VaultStage,
  type WizardState,
} from "./types";

const GOLD = "#C8A96E";
// Unified panel bg (founder spec 2026-05-29).
const BG_GLASS = "rgba(0, 0, 0, 0.3)";
const BORDER_SUBTLE = "rgba(255, 255, 255, 0.15)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  state: WizardState;
  onComplete: (patch: Partial<WizardState>) => void;
  onBack: () => void;
}

export function Step2Details({ state, onComplete, onBack }: Props) {
  // Asking price entered as AED (whole number) — convert to fils on submit.
  const [askingPriceAed, setAskingPriceAed] = useState<string>(
    state.askingPriceFils ? String(BigInt(state.askingPriceFils) / BigInt(100)) : "",
  );
  const [stage, setStage] = useState<VaultStage>(state.stage);
  const [followUpSource, setFollowUpSource] = useState<string>(state.followUpSource ?? "");
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string>(state.nextFollowUpAt ?? "");

  const [ownerName, setOwnerName] = useState<string>(state.ownerContact?.name ?? "");
  const [ownerPhone, setOwnerPhone] = useState<string>(state.ownerContact?.phone ?? "");
  const [ownerEmail, setOwnerEmail] = useState<string>(state.ownerContact?.email ?? "");
  const [ownerRole, setOwnerRole] = useState<string>(state.ownerContact?.role ?? "");
  const [ownerNotes, setOwnerNotes] = useState<string>(state.ownerContact?.notes ?? "");
  const [brokerNotes, setBrokerNotes] = useState<string>(state.brokerNotes ?? "");

  function handleContinue() {
    const ownerContact =
      ownerName || ownerPhone || ownerEmail || ownerRole || ownerNotes
        ? {
            name: ownerName || undefined,
            phone: ownerPhone || undefined,
            email: ownerEmail || undefined,
            role: ownerRole || undefined,
            notes: ownerNotes || undefined,
          }
        : null;
    const askingPriceFils = askingPriceAed
      ? String(BigInt(Math.round(Number(askingPriceAed))) * BigInt(100))
      : null;
    onComplete({
      askingPriceFils,
      stage,
      followUpSource: followUpSource || null,
      nextFollowUpAt: nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
      ownerContact,
      brokerNotes: brokerNotes || null,
    });
  }

  return (
    <div style={containerStyle}>
      <h2 style={h2Style}>Step 2 — Your data</h2>
      <p style={subduedStyle}>
        Your private pipeline info. None of this is visible to other users
        unless you share the plot.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
        <Field label="Asking price (AED)">
          <input
            type="text"
            inputMode="numeric"
            value={askingPriceAed}
            onChange={(e) => setAskingPriceAed(e.target.value.replace(/\D/g, ""))}
            placeholder="50000000"
            style={inputStyle}
          />
        </Field>
        <Field label="Stage">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as VaultStage)}
            style={inputStyle}
          >
            {(Object.keys(VAULT_STAGE_LABELS) as VaultStage[])
              .filter((s) => s !== "PROMOTED" && s !== "CLOSED")
              .map((s) => (
                <option key={s} value={s}>
                  {VAULT_STAGE_LABELS[s]}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Source">
          <input
            type="text"
            value={followUpSource}
            onChange={(e) => setFollowUpSource(e.target.value)}
            placeholder="cold-call / referral / dda-scrape / off-plan / ..."
            style={inputStyle}
            maxLength={40}
          />
        </Field>
        <Field label="Next follow-up">
          <input
            type="datetime-local"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <h3 style={h3Style}>Owner contact (optional)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
        <Field label="Name">
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            maxLength={120}
            style={inputStyle}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+971 …"
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Role">
          <input
            type="text"
            value={ownerRole}
            onChange={(e) => setOwnerRole(e.target.value)}
            placeholder="Owner / Broker / POA / ..."
            maxLength={40}
            style={inputStyle}
          />
        </Field>
      </div>
      <Field label="Notes on owner" style={{ marginTop: 12 }}>
        <textarea
          rows={2}
          value={ownerNotes}
          onChange={(e) => setOwnerNotes(e.target.value)}
          maxLength={2000}
          style={textareaStyle}
        />
      </Field>

      <Field label="Broker notes (private to you)" style={{ marginTop: 18 }}>
        <textarea
          rows={4}
          value={brokerNotes}
          onChange={(e) => setBrokerNotes(e.target.value)}
          maxLength={8000}
          placeholder="Free-form notes — pricing strategy, negotiation history, ..."
          style={textareaStyle}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "space-between" }}>
        <button onClick={onBack} style={buttonSecondaryStyle}>
          ← Back
        </button>
        <button onClick={handleContinue} style={buttonStyle}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Styling helpers (per CLAUDE.md UI STYLE GUIDE) ──

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: TEXT_DIM,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: BG_GLASS,
  backdropFilter: "blur(16px) saturate(150%)",
  WebkitBackdropFilter: "blur(16px) saturate(150%)",
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: 12,
  padding: 24,
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
};

const h2Style: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontWeight: 700,
  fontSize: 20,
  margin: 0,
  letterSpacing: "-0.01em",
};

const h3Style: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontWeight: 700,
  fontSize: 14,
  margin: 0,
  marginTop: 22,
  letterSpacing: "0.02em",
  color: TEXT_DIM,
  textTransform: "uppercase",
};

const subduedStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 13,
  marginTop: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: TEXT_PRIMARY,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 60,
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.15)",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  borderRadius: 8,
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  transition: "background 150ms ease, border-color 150ms ease, transform 150ms ease",
};

const buttonSecondaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER_SUBTLE}`,
  color: TEXT_DIM,
};
