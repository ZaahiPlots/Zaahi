"use client";

// ZAAHI Vault — Promote-to-Public modal.
//
// Bridges into the existing Listings flow via the new Day-5 endpoint
// POST /api/me/vault/entries/[id]/promote, which calls parcel-create.ts
// (the Day-4 lib extracted from /api/parcels/submit's inline logic).
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.5.
//
// MVP scope: collect the minimum fields the promote endpoint requires
// (flow, broker/owner info, asking price). Document upload is deferred
// — admin reaches out for docs separately in MVP. Phase 2.2 can
// inline the existing AddPlotModal doc-upload step here.

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useEscapeClose } from "./useEscapeClose";

const GOLD = "#C8A96E";
// rgba(0,0,0,0.3) — unified panel bg (founder spec 2026-05-29).
const BG_DEEP = "rgba(0, 0, 0, 0.3)";
const BORDER = "rgba(255, 255, 255, 0.15)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  entryId: string;
  entryLabel: string;
  /** Pre-filled from vault entry (AED, not fils). */
  initialAskingAed: number | null;
  onClose: () => void;
  onPromoted: (parcelId: string) => void;
}

export function PromoteToPublicModal({
  entryId,
  entryLabel,
  initialAskingAed,
  onClose,
  onPromoted,
}: Props) {
  const [flow, setFlow] = useState<"broker" | "owner">("broker");
  const [askingAed, setAskingAed] = useState<string>(
    initialAskingAed !== null ? String(initialAskingAed) : "",
  );
  // Broker fields
  const [reraPermit, setReraPermit] = useState("");
  // Owner fields
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeClose(onClose, !submitting);

  async function handleSubmit() {
    if (!askingAed) {
      setError("Asking price required.");
      return;
    }
    if (flow === "broker" && !reraPermit.trim()) {
      setError("RERA permit required for broker promote.");
      return;
    }
    if (flow === "owner" && (!ownerName.trim() || !ownerPhone.trim())) {
      setError("Owner name and phone required for owner promote.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        askingPriceAed: Number(askingAed),
        flow,
        ...(flow === "broker"
          ? { broker: { reraPermit: reraPermit.trim() } }
          : {
              owner: {
                fullName: ownerName.trim(),
                phone: ownerPhone.trim(),
                email: ownerEmail.trim() || undefined,
              },
            }),
      };
      const r = await apiFetch(`/api/me/vault/entries/${entryId}/promote`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (r.status === 409) {
        const d = (await r.json().catch(() => ({}))) as { parcelId?: string };
        setError(
          `Already promoted${d.parcelId ? ` (parcel ${d.parcelId})` : ""}.`,
        );
        return;
      }
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setError(`Promote failed: ${d.error ?? r.status}`);
        return;
      }
      const d = (await r.json()) as { parcelId: string };
      onPromoted(d.parcelId);
      onClose();
    } catch (e) {
      console.error("[PromoteToPublicModal] post:", e);
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
            <div style={tinyLabelStyle}>Promote to Public Listing</div>
            <h2 style={titleStyle}>{entryLabel}</h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">×</button>
        </div>

        <div style={infoBlockStyle}>
          <strong style={{ color: GOLD }}>What happens</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: TEXT_DIM, fontSize: 12, lineHeight: 1.6 }}>
            <li>Creates a public listing in <em>PENDING_REVIEW</em> status</li>
            <li>Admin verifies documents via the existing PlotClaim queue</li>
            <li>Once approved → plot is listed and visible to all approved users</li>
            <li>Your vault entry stays as the pipeline record (stage → PROMOTED)</li>
          </ul>
        </div>

        <Field label="I am the…" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setFlow("broker")} style={togglePillStyle(flow === "broker")}>
              Broker
            </button>
            <button onClick={() => setFlow("owner")} style={togglePillStyle(flow === "owner")}>
              Owner
            </button>
          </div>
        </Field>

        <Field label="Asking price (AED)" style={{ marginTop: 14 }}>
          <input
            type="text"
            inputMode="numeric"
            value={askingAed}
            onChange={(e) => setAskingAed(e.target.value.replace(/\D/g, ""))}
            style={inputStyle}
          />
        </Field>

        {flow === "broker" && (
          <Field label="RERA permit" style={{ marginTop: 14 }}>
            <input
              type="text"
              value={reraPermit}
              onChange={(e) => setReraPermit(e.target.value)}
              placeholder="RERA permit number"
              maxLength={64}
              style={inputStyle}
            />
          </Field>
        )}

        {flow === "owner" && (
          <>
            <Field label="Full name (as on Title Deed)" style={{ marginTop: 14 }}>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                maxLength={128}
                style={inputStyle}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
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
            </div>
          </>
        )}

        <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255, 255, 255, 0.02)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, color: TEXT_DIM }}>
          Document upload (Title Deed / Contract) happens after promote — admin
          will reach out via email. Phase 2.2 will inline the upload here.
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <div style={actionRowStyle}>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={submitting ? buttonDisabledStyle : primaryButtonStyle}
          >
            {submitting ? "Promoting…" : "Promote to public"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
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
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
  };
}

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
  maxWidth: 560,
  width: "100%",
  maxHeight: "85vh",
  overflowY: "auto",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
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

const infoBlockStyle: React.CSSProperties = {
  padding: 14,
  background: "rgba(200, 169, 110, 0.05)",
  border: `1px solid rgba(200, 169, 110, 0.2)`,
  borderRadius: 8,
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
  marginTop: 18,
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
