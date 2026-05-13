"use client";

// ZAAHI Vault — Upload Wizard Step 1: plot number + DDA hit branch
// or manual entry branch.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.1.
//
// On Continue:
//   • DDA hit → calls onComplete with auto-filled facts from /api/me/vault/plot-lookup
//   • Manual entry → user typed area/lat/lng/landUse; calls onComplete with those
//
// If /api/me/vault/plot-lookup returns existing=<entry>, parent should
// short-circuit to edit mode (we surface this case via onExistingFound).

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  EMIRATES,
  EMIRATE_LABELS,
  LAND_USE_LABELS,
  type Emirate,
  type LandUse,
  type PlotLookupResponse,
  type WizardState,
} from "./types";

// ZAAHI palette
const GOLD = "#C8A96E";
const BG_GLASS = "rgba(10, 22, 40, 0.4)";
const BORDER_SUBTLE = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  state: WizardState;
  onComplete: (patch: Partial<WizardState>) => void;
  onExistingFound: (existingId: string) => void;
}

export function Step1PlotLookup({ state, onComplete, onExistingFound }: Props) {
  const [emirate, setEmirate] = useState<Emirate>(state.emirate);
  const [district, setDistrict] = useState(state.district);
  const [plotNumber, setPlotNumber] = useState(state.plotNumber);
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<PlotLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual-mode inputs (revealed when source === "not_found")
  const [area, setArea] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [landUse, setLandUse] = useState<LandUse | "">("");

  const canLookup =
    plotNumber.match(/^\d{5,10}$/) && district.trim().length > 0 && !loading;

  async function handleLookup() {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/api/me/vault/plot-lookup", {
        method: "POST",
        body: JSON.stringify({ emirate, district: district.trim(), plotNumber }),
      });
      if (!r.ok) {
        setError(`Lookup failed (${r.status})`);
        return;
      }
      const data = (await r.json()) as PlotLookupResponse;
      setLookupResult(data);

      // Existing-entry short-circuit — let parent handle navigation.
      if (data.existing) {
        onExistingFound(data.existing.id);
        return;
      }
    } catch (e) {
      console.error("[wizard step1] lookup failed:", e);
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinueDda() {
    if (!lookupResult || lookupResult.source !== "dda" || !lookupResult.ddaData) return;
    const dda = lookupResult.ddaData;
    onComplete({
      emirate,
      district: dda.district || district.trim(),
      plotNumber,
      source: "dda",
      area: dda.area,
      latitude: dda.latitude,
      longitude: dda.longitude,
      geometry: dda.geometry,
      landUse: (dda.landUse?.toUpperCase() as LandUse) ?? null,
    });
  }

  function handleContinueManual() {
    onComplete({
      emirate,
      district: district.trim(),
      plotNumber,
      source: "manual",
      area: area ? Number(area) : null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      geometry: null,
      landUse: (landUse || null) as LandUse | null,
    });
  }

  return (
    <div style={containerStyle}>
      <h2 style={h2Style}>Step 1 — Plot number</h2>
      <p style={subduedStyle}>
        Enter the plot you&apos;re tracking. If it&apos;s in DDA we&apos;ll prefill the
        facts; otherwise you&apos;ll add basic info manually.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12, marginTop: 16 }}>
        <Field label="Emirate">
          <select
            value={emirate}
            onChange={(e) => setEmirate(e.target.value as Emirate)}
            style={inputStyle}
          >
            {EMIRATES.map((e) => (
              <option key={e} value={e}>
                {EMIRATE_LABELS[e]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="District">
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. Al Barari"
            style={inputStyle}
          />
        </Field>
        <Field label="Plot number">
          <input
            type="text"
            value={plotNumber}
            onChange={(e) => setPlotNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="6457940"
            style={inputStyle}
          />
        </Field>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {!lookupResult && (
        <button
          onClick={handleLookup}
          disabled={!canLookup}
          style={canLookup ? buttonStyle : buttonDisabledStyle}
        >
          {loading ? "Looking up..." : "Look up plot"}
        </button>
      )}

      {lookupResult?.source === "dda" && lookupResult.ddaData && (
        <div style={resultBlockStyle}>
          <div style={{ color: GOLD, fontWeight: 600, marginBottom: 8 }}>✓ Found in DDA</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
            District: <span style={{ color: TEXT_PRIMARY }}>{lookupResult.ddaData.district}</span>
            <br />
            Area: <span style={{ color: TEXT_PRIMARY }}>
              {lookupResult.ddaData.area
                ? `${lookupResult.ddaData.area.toLocaleString()} sqft`
                : "—"}
            </span>
            <br />
            Land use: <span style={{ color: TEXT_PRIMARY }}>{lookupResult.ddaData.landUse ?? "—"}</span>
            <br />
            Geometry: <span style={{ color: TEXT_PRIMARY }}>{lookupResult.ddaData.geometry ? "✓" : "—"}</span>
          </div>
          <button onClick={handleContinueDda} style={{ ...buttonStyle, marginTop: 16 }}>
            Continue with these facts →
          </button>
        </div>
      )}

      {lookupResult?.source === "not_found" && (
        <div style={resultBlockStyle}>
          <div style={{ color: TEXT_DIM, marginBottom: 4 }}>
            ⚠ This plot isn&apos;t in DDA. Add it manually for now — Phase 2.2 will support
            Affection Plan PDF upload to auto-build the 3D geometry.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="Area (sqft)">
              <input
                type="text"
                inputMode="decimal"
                value={area}
                onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="optional"
                style={inputStyle}
              />
            </Field>
            <Field label="Latitude">
              <input
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value.replace(/[^\d.-]/g, ""))}
                placeholder="24.45"
                style={inputStyle}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value.replace(/[^\d.-]/g, ""))}
                placeholder="54.37"
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Land use" style={{ marginTop: 12 }}>
            <select
              value={landUse}
              onChange={(e) => setLandUse(e.target.value as LandUse | "")}
              style={inputStyle}
            >
              <option value="">— Select —</option>
              {(Object.keys(LAND_USE_LABELS) as LandUse[]).map((k) => (
                <option key={k} value={k}>
                  {LAND_USE_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <button onClick={handleContinueManual} style={{ ...buttonStyle, marginTop: 16 }}>
            Continue with manual entry →
          </button>
        </div>
      )}
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
  marginTop: 18,
  transition: "background 150ms ease, border-color 150ms ease, transform 150ms ease",
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  color: "#E63946",
  fontSize: 13,
  marginTop: 12,
};

const resultBlockStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  background: "rgba(255, 255, 255, 0.03)",
  border: `1px solid ${BORDER_SUBTLE}`,
  borderRadius: 10,
};
