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

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useFormatArea } from "@/lib/area-unit";
import { supabaseBrowser } from "@/lib/supabase-browser";
import CoordsEntry, { type CoordsEntryResult } from "@/components/CoordsEntry";
import { Spinner } from "../Spinner";
import {
  EMIRATES,
  EMIRATE_LABELS,
  LAND_USE_LABELS,
  type Emirate,
  type LandUse,
  type PlotLookupResponse,
  type WizardState,
} from "./types";

// Affection Plan PDF upload — Sprint 1 stores the raw file in the
// registration-docs private bucket (RLS: first folder = userId, see
// AddPlotModal uploadDoc helper). Path layout puts vault uploads
// under a separate subfolder so admin-side review surfaces don't
// have to disambiguate from cohort-pilot title deeds.
const VAULT_DOC_BUCKET = "registration-docs";
const MAX_VAULT_DOC_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_VAULT_DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// ZAAHI palette
const GOLD = "#C8A96E";
// Unified panel bg (founder spec 2026-05-29).
const BG_GLASS = "rgba(0, 0, 0, 0.3)";
const BORDER_SUBTLE = "rgba(255, 255, 255, 0.15)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  state: WizardState;
  onComplete: (patch: Partial<WizardState>) => void;
  onExistingFound: (existingId: string) => void;
}

export function Step1PlotLookup({ state, onComplete, onExistingFound }: Props) {
  const fmtA = useFormatArea();
  const [emirate, setEmirate] = useState<Emirate>(state.emirate);
  const [district, setDistrict] = useState(state.district);
  const [plotNumber, setPlotNumber] = useState(state.plotNumber);
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<PlotLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual-mode inputs (revealed when source === "not_found"). The
  // legacy lat/lng/area stubs are gone — Sprint 1 collects a real
  // polygon via CoordsEntry. The data fields below are optional for
  // vault (founder D7); without maxFloors we render flat 2D.
  const [coords, setCoords] = useState<CoordsEntryResult | null>(null);
  const [landUse, setLandUse] = useState<LandUse | "">("");
  const [maxFloorsInput, setMaxFloorsInput] = useState<string>("");
  const [maxHeightCode, setMaxHeightCode] = useState<string>("");
  const [farInput, setFarInput] = useState<string>("");
  const [affectionFile, setAffectionFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function pickAffectionFile(f: File | null) {
    setDocError(null);
    if (!f) {
      setAffectionFile(null);
      return;
    }
    if (f.size > MAX_VAULT_DOC_BYTES) {
      setDocError(`${f.name} exceeds 15 MB.`);
      return;
    }
    if (f.type && !ALLOWED_VAULT_DOC_MIME.has(f.type)) {
      setDocError(`${f.name}: only PDF / JPG / PNG / WebP allowed.`);
      return;
    }
    setAffectionFile(f);
  }

  const canLookup =
    !!plotNumber.match(/^\d{5,10}$/) && !loading;

  // Auto-trigger lookup on mount when the wizard was opened with a
  // pre-filled plotNumber (hover card "+ Add to Vault" entry point).
  // Runs once per mount via the ref guard so React 18 StrictMode
  // double-invocation doesn't fire two parallel lookup requests.
  const autoLookupFiredRef = useRef(false);
  useEffect(() => {
    if (autoLookupFiredRef.current) return;
    if (state.plotNumber && state.plotNumber.match(/^\d{5,10}$/)) {
      autoLookupFiredRef.current = true;
      void handleLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    try {
      // District field was removed from the initial form (founder spec
      // 2026-05-30) — DDA returns the canonical district anyway. We send
      // "AUTO" as a placeholder to satisfy the plot-lookup schema's
      // `district.min(1)`. Existing-entry short-circuit may miss a
      // prior duplicate when the stored district differs from "AUTO";
      // the DB unique constraint on (ownerId, emirate, district,
      // plotNumber) still catches duplicates on create (entries POST
      // surfaces a P2002 with the existing id), so the worst-case is
      // a slightly worse error message, never silent dup writes.
      const lookupDistrict = district.trim() || "AUTO";
      const r = await apiFetch("/api/me/vault/plot-lookup", {
        method: "POST",
        body: JSON.stringify({ emirate, district: lookupDistrict, plotNumber }),
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
      ddaSnapshot: dda.ddaSnapshot ?? null,
      // Phase 2/3 — pass affection plan + building limit through to
      // /api/me/vault/entries so ensureVaultPrivateParcel skips the
      // second DDA round-trip.
      plan: dda.plan ?? null,
      buildingLimit: dda.buildingLimit ?? null,
      landUse: (dda.landUse?.toUpperCase() as LandUse) ?? null,
    });
  }

  async function handleContinueManual() {
    // Defensive — the Continue button is also disabled when these
    // aren't satisfied, but keep the guard here so the flow doesn't
    // half-complete if a future caller invokes this directly.
    if (!coords?.polygon) {
      setDocError("Polygon required (3+ corners).");
      return;
    }
    if (district.trim().length === 0) {
      setDocError("District required.");
      return;
    }
    if (!affectionFile) {
      setDocError("Affection Plan PDF is required.");
      return;
    }
    setUploading(true);
    setDocError(null);
    let affectionPlanPath: string | null = null;
    try {
      const { data: sess } = await supabaseBrowser.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        setDocError("Sign in expired — please sign in again.");
        setUploading(false);
        return;
      }
      const ext =
        affectionFile.name.split(".").pop()?.toLowerCase().slice(0, 8) || "bin";
      // RLS: first folder must be the caller's userId. Vault uploads
      // live under <userId>/vault-affection-plans/<plotNumber>/ so
      // admin-side review surfaces (Sprint 2) can distinguish them
      // from cohort-pilot title deeds also stored in this bucket.
      const path = `${userId}/vault-affection-plans/${plotNumber}/${Date.now()}.${ext}`;
      const { error } = await supabaseBrowser.storage
        .from(VAULT_DOC_BUCKET)
        .upload(path, affectionFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: affectionFile.type || undefined,
        });
      if (error) {
        setDocError(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }
      affectionPlanPath = path;
    } catch (e) {
      setDocError(
        `Upload error: ${e instanceof Error ? e.message : "unknown"}`,
      );
      setUploading(false);
      return;
    } finally {
      // setUploading(false) in the success path below — we keep the
      // button disabled until onComplete fires so a double-click
      // doesn't queue two uploads.
    }
    const parsedFloors = Number(maxFloorsInput);
    const parsedFar = Number(farInput);
    onComplete({
      emirate,
      district: district.trim(),
      plotNumber,
      source: "manual",
      area: coords.areaSqft || null, // auto-computed from polygon
      latitude: null, // centroid lives on the polygon; ensureVaultPrivateParcel derives it
      longitude: null,
      geometry: coords.polygon as unknown,
      ddaSnapshot: null,
      plan: null,
      buildingLimit: null,
      landUse: (landUse || null) as LandUse | null,
      maxFloors: Number.isFinite(parsedFloors) && parsedFloors > 0 ? parsedFloors : null,
      maxHeightCode: maxHeightCode.trim() || null,
      far: Number.isFinite(parsedFar) && parsedFar > 0 ? parsedFar : null,
      affectionPlanPath,
    });
    setUploading(false);
  }

  return (
    <div style={containerStyle}>
      <h2 style={h2Style}>Step 1 — Plot number</h2>
      <p style={subduedStyle}>
        Enter the plot you&apos;re tracking. If it&apos;s in DDA we&apos;ll prefill the
        facts; otherwise you&apos;ll add basic info manually.
      </p>

      {/* Founder spec 2026-05-30 — initial form is Emirate + Plot Number
          only. District is pulled from DDA on hit (shown read-only in
          the result block below). For not_found plots we reveal a
          District input alongside the manual-mode fields. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
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
        <>
          <button
            onClick={handleLookup}
            disabled={!canLookup}
            style={canLookup ? buttonStyle : buttonDisabledStyle}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Spinner size={14} />
                Looking up in DDA…
              </span>
            ) : (
              "Look up plot"
            )}
          </button>
          {loading && (
            <p style={{ ...subduedStyle, marginTop: 8, fontSize: 11 }}>
              Querying DDA server — usually 1–2 seconds.
            </p>
          )}
        </>
      )}

      {lookupResult?.source === "dda" && lookupResult.ddaData && (
        <div style={resultBlockStyle}>
          <div style={{ color: GOLD, fontWeight: 600, marginBottom: 8 }}>✓ Found in DDA</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
            District: <span style={{ color: TEXT_PRIMARY }}>{lookupResult.ddaData.district}</span>
            <br />
            Area: <span style={{ color: TEXT_PRIMARY }}>
              {fmtA(lookupResult.ddaData.area, null) ?? "—"}
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
          <div style={{ color: TEXT_DIM, marginBottom: 12, fontSize: 12 }}>
            This plot isn&apos;t in DDA. Enter the corner coordinates
            from your site plan or Affection Plan — we&apos;ll build the
            polygon and put it on the map.
          </div>

          <Field label="District">
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Al Barari"
              style={inputStyle}
            />
          </Field>

          <div style={{ marginTop: 14 }}>
            <CoordsEntry
              emirate={emirate}
              onChange={setCoords}
            />
          </div>

          {/* Land use is mandatory for 3D color even on vault. Floor
              count drives 3D extrusion — optional on vault (D7); without
              it the plot renders as a flat 2D polygon. */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Land use (drives 3D colour)">
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
            <Field label="Max floors (optional, drives 3D height)">
              <input
                type="text"
                inputMode="numeric"
                value={maxFloorsInput}
                onChange={(e) =>
                  setMaxFloorsInput(e.target.value.replace(/[^\d]/g, "").slice(0, 3))
                }
                placeholder="e.g. 5"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label='Height code (optional, e.g. "G+7")'>
              <input
                type="text"
                value={maxHeightCode}
                onChange={(e) => setMaxHeightCode(e.target.value.slice(0, 12))}
                placeholder="e.g. G+7+R"
                style={inputStyle}
              />
            </Field>
            <Field label="FAR (optional)">
              <input
                type="text"
                inputMode="decimal"
                value={farInput}
                onChange={(e) =>
                  setFarInput(e.target.value.replace(/[^\d.]/g, "").slice(0, 6))
                }
                placeholder="e.g. 2.5"
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Affection Plan PDF — mandatory in Sprint 1. Sprint 3 will
              auto-parse this via Claude vision; for now we just store
              the file for reference (and admin verification on the
              listing flow). */}
          <div style={{ marginTop: 16 }}>
            <Field label="Affection Plan PDF (required)">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => pickAffectionFile(e.target.files?.[0] ?? null)}
                style={{
                  ...inputStyle,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              />
            </Field>
            {affectionFile && (
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>
                Selected: {affectionFile.name}{" "}
                ({Math.round(affectionFile.size / 1024)} KB)
              </div>
            )}
          </div>

          {docError && (
            <p style={{ ...errorStyle, marginTop: 10 }}>{docError}</p>
          )}

          <button
            onClick={handleContinueManual}
            disabled={
              uploading ||
              district.trim().length === 0 ||
              !coords?.polygon ||
              !affectionFile
            }
            style={
              !uploading &&
              district.trim().length > 0 &&
              !!coords?.polygon &&
              !!affectionFile
                ? { ...buttonStyle, marginTop: 16 }
                : { ...buttonDisabledStyle, marginTop: 16 }
            }
          >
            {uploading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Spinner size={14} />
                Uploading document…
              </span>
            ) : (
              "Continue with manual entry →"
            )}
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
