"use client";

// ZAAHI Vault — Upload Wizard Step 3: preview + submit.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.1.
//
// Submits to POST /api/me/vault/entries on confirm.

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useFormatArea } from "@/lib/area-unit";
import { Spinner } from "../Spinner";
import {
  EMIRATE_LABELS,
  LAND_USE_LABELS,
  type LandUse,
  type WizardState,
} from "./types";

/** Coordinates passed back to the caller so the map can fly to the new entry. */
export interface CreatedCoords {
  latitude: number | null;
  longitude: number | null;
}

const GOLD = "#C8A96E";
// Unified panel bg (founder spec 2026-05-29).
const BG_GLASS = "rgba(0, 0, 0, 0.3)";
const BORDER_SUBTLE = "rgba(255, 255, 255, 0.15)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  state: WizardState;
  onBack: () => void;
  onCreated: (entryId: string, coords: CreatedCoords) => void;
  onCancel: () => void;
  /** Surfaces submit-side errors so the parent can show a toast. The
   *  inline error inside the modal stays as-is; this is an additive
   *  notification channel. Wizard error path: 409 (already in vault),
   *  500 (server), network failure. */
  onError?: (message: string) => void;
}

export function Step3Confirm({ state, onBack, onCreated, onCancel, onError }: Props) {
  const fmtA = useFormatArea();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        emirate: state.emirate,
        district: state.district,
        plotNumber: state.plotNumber,
        area: state.area ?? undefined,
        latitude: state.latitude ?? undefined,
        longitude: state.longitude ?? undefined,
        geometry: state.geometry ?? undefined,
        ddaSnapshot: state.ddaSnapshot ?? undefined,
        // Phase 2/3 — passthrough affection plan + building limit
        // (collected by Step 1 from /api/me/vault/plot-lookup) so
        // ensureVaultPrivateParcel skips the second DDA round-trip.
        plan: state.plan ?? undefined,
        buildingLimit: state.buildingLimit ?? undefined,
        landUse: state.landUse ?? undefined,
        // Sprint 1 non-DDA manual fields — passthrough so the
        // server-side AffectionPlan create can persist them on the
        // raw blob + the typed columns (maxFloors / maxHeightCode /
        // far). affectionPlanPath points at the Supabase Storage
        // upload made in Step 1.
        maxFloors: state.maxFloors ?? undefined,
        maxHeightCode: state.maxHeightCode ?? undefined,
        far: state.far ?? undefined,
        affectionPlanPath: state.affectionPlanPath ?? undefined,
        askingPriceFils: state.askingPriceFils ?? undefined,
        ownerContact: state.ownerContact ?? undefined,
        brokerNotes: state.brokerNotes ?? undefined,
        stage: state.stage,
        source: state.followUpSource ?? undefined,
        nextFollowUpAt: state.nextFollowUpAt ?? undefined,
      };
      const r = await apiFetch("/api/me/vault/entries", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (r.status === 409) {
        const data = await r.json().catch(() => ({}));
        const msg = `You already have this plot in your vault. (existing id: ${data.existingId ?? "unknown"})`;
        setError(msg);
        onError?.(msg);
        return;
      }
      if (!r.ok) {
        // Parse server error body for a human-friendly hint when available.
        // Shape from /api/me/vault/entries: { error, hint? }.
        let serverMsg = "";
        try {
          const body = (await r.json()) as { error?: string; hint?: string };
          serverMsg = body.hint || body.error || "";
        } catch { /* response not JSON */ }
        const msg = serverMsg
          ? `${serverMsg} (HTTP ${r.status})`
          : `Submit failed (${r.status})`;
        setError(msg);
        onError?.(msg);
        return;
      }
      const created = (await r.json()) as { id: string };
      // Pass coords through so the map can flyTo + auto-enable the layer.
      // Coords come from wizard state — either DDA-derived centroid (Path 1)
      // or user-entered lat/lng (manual Branch B). Null if user skipped.
      onCreated(created.id, { latitude: state.latitude, longitude: state.longitude });
    } catch (e) {
      console.error("[wizard step3] submit failed:", e);
      const msg = "Network error — please try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const askingPriceAed = state.askingPriceFils
    ? Number(BigInt(state.askingPriceFils) / BigInt(100))
    : null;

  return (
    <div style={containerStyle}>
      <h2 style={h2Style}>Step 3 — Confirm</h2>
      <p style={subduedStyle}>
        Review what gets saved. Your data stays private — only you (and people
        you explicitly share with) will see this entry.
      </p>

      <div style={previewBlockStyle}>
        <Row label="Plot">{`${state.plotNumber} · ${state.district} · ${EMIRATE_LABELS[state.emirate]}`}</Row>
        <Row label="Source">
          {state.source === "dda" ? "DDA (auto-built 3D)" : "Manual entry"}
        </Row>
        {state.area !== null && <Row label="Area">{fmtA(state.area, null) ?? "—"}</Row>}
        {(state.latitude !== null && state.longitude !== null) && (
          <Row label="Coordinates">{`${state.latitude.toFixed(5)}, ${state.longitude.toFixed(5)}`}</Row>
        )}
        {state.landUse && (
          <Row label="Land use">
            {LAND_USE_LABELS[state.landUse as LandUse] ?? state.landUse}
          </Row>
        )}
        {askingPriceAed !== null && (
          <Row label="Asking price">{`AED ${askingPriceAed.toLocaleString()}`}</Row>
        )}
        {state.followUpSource && <Row label="Source memo">{state.followUpSource}</Row>}
        {state.nextFollowUpAt && (
          <Row label="Next follow-up">
            {new Date(state.nextFollowUpAt).toLocaleString()}
          </Row>
        )}
        {state.ownerContact && (
          <Row label="Owner contact">
            {[state.ownerContact.name, state.ownerContact.phone, state.ownerContact.role]
              .filter(Boolean)
              .join(" · ") || "(set)"}
          </Row>
        )}
        {state.brokerNotes && (
          <Row label="Broker notes">{state.brokerNotes.slice(0, 140) + (state.brokerNotes.length > 140 ? "…" : "")}</Row>
        )}
      </div>

      <div style={infoBlockStyle}>
        <strong style={{ color: GOLD }}>What happens next</strong>
        <ul style={{ marginTop: 6, paddingLeft: 18, color: TEXT_DIM, fontSize: 13, lineHeight: 1.6 }}>
          <li>The plot appears in your private vault immediately.</li>
          <li>On the map it shows as a {state.geometry ? "3D building" : "flat marker"} only you can see.</li>
          <li>If another vault user has this plot with different data, both of you see an informational banner.</li>
          <li>You can share with named users any time. To list publicly, use &quot;Promote to Public&quot; from the side panel — that flow has its own verification step (Title Deed / Contract).</li>
        </ul>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "space-between" }}>
        <button onClick={onBack} disabled={submitting} style={buttonSecondaryStyle}>
          ← Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} disabled={submitting} style={buttonSecondaryStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={submitting ? buttonDisabledStyle : buttonStyle}
          >
            {submitting ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Spinner size={14} />
                Saving to vault…
              </span>
            ) : (
              "Add to my vault"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        padding: "6px 0",
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        fontSize: 13,
      }}
    >
      <div style={{ color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>
        {label}
      </div>
      <div style={{ color: TEXT_PRIMARY }}>{children}</div>
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

const subduedStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 13,
  marginTop: 6,
};

const previewBlockStyle: React.CSSProperties = {
  marginTop: 18,
  padding: "0 16px",
  background: "rgba(255, 255, 255, 0.03)",
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: 10,
};

const infoBlockStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  background: "rgba(200, 169, 110, 0.05)",
  border: `1px solid rgba(200, 169, 110, 0.2)`,
  borderRadius: 10,
};

const errorStyle: React.CSSProperties = {
  color: "#E63946",
  fontSize: 13,
  marginTop: 12,
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

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};
