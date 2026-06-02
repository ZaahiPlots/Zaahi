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
import { type ProjectionKey } from "@/lib/coords-projection";
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

  // Document-first manual entry (founder spec 2026-06-02):
  //   mode "init"    → file picker + "skip to manual" fallback
  //   mode "parsing" → spinner; Claude vision running
  //   mode "review"  → CoordsEntry + data fields, pre-filled from parser
  //                    (or blank for fallback). User edits + confirms.
  // We always land in "review" before save — even after a high-confidence
  // parse — because the founder rule "parser never saves silently"
  // requires explicit user verification (Capital 6 prevention).
  type Mode = "init" | "parsing" | "review";
  const [mode, setMode] = useState<Mode>("init");
  const [parserSource, setParserSource] = useState<"parser" | "manual" | null>(
    null,
  );
  const [parserConfidence, setParserConfidence] = useState<
    "high" | "partial" | "low" | null
  >(null);
  const [parserWarnings, setParserWarnings] = useState<string[]>([]);
  // Bumps when the parser returns new data — forces CoordsEntry to
  // remount with the fresh initialText/initialProjection seeded from
  // the parse result. Keeps the user's subsequent edits sticky
  // until the next parse round.
  const [coordsSeedKey, setCoordsSeedKey] = useState(0);
  const [seedText, setSeedText] = useState("");
  const [seedProjection, setSeedProjection] = useState<ProjectionKey | undefined>(
    undefined,
  );

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

  // Read a File as base64 (sans data: prefix). Used to feed the
  // affection plan into /api/parcels/parse-affection-plan.
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const out = reader.result;
        if (typeof out === "string") {
          // strip "data:<mime>;base64," prefix
          const i = out.indexOf(",");
          resolve(i >= 0 ? out.slice(i + 1) : out);
        } else {
          reject(new Error("FileReader gave non-string result"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  // Convert parser-emitted points back into the textarea format
  // CoordsEntry expects. Founder rule: parser is a suggestor — the
  // user sees these exact numbers and can edit/override.
  function pointsToTextarea(points: Array<[number, number]>): string {
    return points
      .map(([a, b]) => `${a}, ${b}`)
      .join("\n");
  }

  type ParserResponse = {
    fields?: {
      coords?: {
        points?: Array<[number, number]> | null;
        projection?: "DLTM" | "UTM40N" | "WGS84" | null;
        source?: "table" | "diagram" | null;
      };
      data?: {
        plotAreaSqft?: number | null;
        maxGfaSqft?: number | null;
        far?: number | null;
        maxFloors?: number | null;
        maxHeightCode?: string | null;
        landUseCategory?: string | null;
        projectName?: string | null;
        community?: string | null;
        masterDeveloper?: string | null;
      };
      confidence?: "high" | "partial" | "low";
      warnings?: string[];
    };
    cached?: boolean;
    error?: string;
  };

  // ── Document-first entry path (founder spec 2026-06-02) ──
  // Upload the file (if present) → call parse-affection-plan →
  // pre-fill the review form. The user lands in mode="review"
  // regardless of parser outcome; high-confidence parses just
  // start with most fields filled.
  async function handleParseDocument() {
    if (!affectionFile) {
      setDocError("Pick an Affection Plan file first.");
      return;
    }
    setUploading(true);
    setDocError(null);
    setMode("parsing");
    try {
      // 1) Upload to Supabase Storage. Path identical to Sprint 1 so
      //    admin review surfaces (Sprint 2 listing) can find vault
      //    uploads under a stable convention.
      const { data: sess } = await supabaseBrowser.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        setDocError("Sign in expired — please sign in again.");
        setMode("init");
        setUploading(false);
        return;
      }
      const ext =
        affectionFile.name.split(".").pop()?.toLowerCase().slice(0, 8) || "bin";
      const path = `${userId}/vault-affection-plans/${plotNumber}/${Date.now()}.${ext}`;
      const upload = await supabaseBrowser.storage
        .from(VAULT_DOC_BUCKET)
        .upload(path, affectionFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: affectionFile.type || undefined,
        });
      if (upload.error) {
        setDocError(`Upload failed: ${upload.error.message}`);
        setMode("init");
        setUploading(false);
        return;
      }
      // Stash the path so handleContinueManual reuses it without
      // re-uploading on Continue.
      uploadedPathRef.current = path;

      // 2) Parse via Claude vision. Convert to base64 first so the
      //    Anthropic API receives an inline document/image.
      const base64 = await fileToBase64(affectionFile);
      const parseRes = await apiFetch("/api/parcels/parse-affection-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          mediaType: affectionFile.type || "application/pdf",
          emirate,
        }),
      });

      if (!parseRes.ok) {
        // Founder rule: parser outage falls back to manual review,
        // does NOT block the user. The file is already uploaded so
        // Continue still works once they fill the fields by hand.
        setParserSource("manual");
        setParserConfidence("low");
        setParserWarnings([
          `Parser unavailable (${parseRes.status}) — enter fields manually below.`,
        ]);
        setMode("review");
        setUploading(false);
        return;
      }

      const json = (await parseRes.json()) as ParserResponse;
      const fields = json.fields ?? {};

      // 3) Seed the review form from the parser output. Empty / null
      //    fields stay empty — user fills them. Capital 6 prevention
      //    is built into CoordsEntry (sanity check on centroid vs
      //    emirate centre), so even a wrong-projection parse surfaces
      //    a red warning instead of a silent save.
      const parsedPoints = fields.coords?.points ?? null;
      if (parsedPoints && parsedPoints.length >= 3) {
        setSeedText(pointsToTextarea(parsedPoints));
      } else {
        setSeedText("");
      }
      const parsedProjection = fields.coords?.projection ?? null;
      setSeedProjection(parsedProjection ?? undefined);
      // Data fields
      const dataFields = fields.data ?? {};
      if (typeof dataFields.maxFloors === "number" && dataFields.maxFloors > 0) {
        setMaxFloorsInput(String(dataFields.maxFloors));
      }
      if (typeof dataFields.maxHeightCode === "string" && dataFields.maxHeightCode.trim()) {
        setMaxHeightCode(dataFields.maxHeightCode.trim());
      }
      if (typeof dataFields.far === "number" && dataFields.far > 0) {
        setFarInput(String(dataFields.far));
      }
      const cat = dataFields.landUseCategory;
      if (typeof cat === "string" && (Object.keys(LAND_USE_LABELS) as string[]).includes(cat)) {
        setLandUse(cat as LandUse);
      }

      setParserSource("parser");
      setParserConfidence(json.fields?.confidence ?? "low");
      setParserWarnings(json.fields?.warnings ?? []);
      setCoordsSeedKey((k) => k + 1);
      setMode("review");
    } catch (e) {
      console.error("[wizard step1 parse-affection-plan]", e);
      setDocError(
        `Parser error: ${e instanceof Error ? e.message : "unknown"}`,
      );
      setMode("init");
    } finally {
      setUploading(false);
    }
  }

  // Skip parser, go straight to manual entry (founder Q1 fallback).
  // Affection Plan file is still required for save — user must come
  // back and upload before hitting Continue.
  function handleManualEntryFallback() {
    setParserSource("manual");
    setParserConfidence(null);
    setParserWarnings([]);
    setSeedText("");
    setSeedProjection(undefined);
    setCoordsSeedKey((k) => k + 1);
    setMode("review");
  }

  // Path of the uploaded PDF (set during handleParseDocument or, when
  // the user took the manual-entry fallback, set inside
  // handleContinueManual). Cached so the Continue flow doesn't
  // double-upload.
  const uploadedPathRef = useRef<string | null>(null);

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
    // Reuse the path captured during handleParseDocument if it ran;
    // if the user took the manual-entry fallback, the file hasn't
    // been uploaded yet so do it now.
    let affectionPlanPath: string | null = uploadedPathRef.current;
    try {
      if (!affectionPlanPath) {
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
        uploadedPathRef.current = path;
      }
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
          {/* ── Document-first flow (founder spec 2026-06-02) ──
              Three sub-modes inside the not_found branch:
                init     → file picker + skip-to-manual fallback
                parsing  → Claude vision spinner
                review   → CoordsEntry + data fields, pre-filled
                           from the parser (or blank when the user
                           skipped). Always landed in for explicit
                           Confirm — parser is a suggestor, never
                           autosaves. */}
          {mode === "init" && (
            <>
              <div style={{ color: TEXT_DIM, marginBottom: 12, fontSize: 12 }}>
                This plot isn&apos;t in DDA. Upload the Affection Plan
                (or DCR for Abu Dhabi) — we&apos;ll read the corners,
                area, FAR and floor count from it, then you confirm
                on the map before saving.
              </div>

              <Field label="Affection Plan PDF / image (required)">
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

              {docError && (
                <p style={{ ...errorStyle, marginTop: 10 }}>{docError}</p>
              )}

              <button
                onClick={handleParseDocument}
                disabled={!affectionFile || uploading}
                style={
                  affectionFile && !uploading
                    ? { ...buttonStyle, marginTop: 16 }
                    : { ...buttonDisabledStyle, marginTop: 16 }
                }
              >
                Parse document →
              </button>
              <button
                onClick={handleManualEntryFallback}
                style={{
                  ...buttonStyle,
                  marginTop: 8,
                  background: "transparent",
                  border: `1px solid ${BORDER_SUBTLE}`,
                  color: TEXT_DIM,
                }}
              >
                Manual entry instead
              </button>
              <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 6 }}>
                Use manual entry if your document doesn&apos;t parse
                cleanly — the file is still required at the Confirm step.
              </div>
            </>
          )}

          {mode === "parsing" && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Spinner size={28} />
              <div style={{ marginTop: 14, color: TEXT_PRIMARY, fontSize: 13 }}>
                Reading the document…
              </div>
              <div style={{ marginTop: 4, color: TEXT_DIM, fontSize: 11 }}>
                Usually 3–8 seconds.
              </div>
            </div>
          )}

          {mode === "review" && (
            <>
              {/* Parser provenance banner — colour depends on confidence. */}
              {parserSource === "parser" && (
                <div
                  style={{
                    padding: 10,
                    marginBottom: 12,
                    borderRadius: 6,
                    border: `1px solid ${
                      parserConfidence === "high"
                        ? "rgba(45, 106, 79, 0.6)"
                        : parserConfidence === "partial"
                          ? "rgba(230, 126, 34, 0.6)"
                          : "rgba(230, 126, 34, 0.4)"
                    }`,
                    background:
                      parserConfidence === "high"
                        ? "rgba(45, 106, 79, 0.10)"
                        : "rgba(230, 126, 34, 0.10)",
                    fontSize: 12,
                    color: TEXT_PRIMARY,
                  }}
                >
                  <strong>
                    {parserConfidence === "high"
                      ? "✓ Parsed from document — verify before save"
                      : parserConfidence === "partial"
                        ? "⚠ Partially parsed — fill the gaps and verify"
                        : "⚠ Low-confidence parse — review everything below"}
                  </strong>
                  {parserWarnings.length > 0 && (
                    <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                      {parserWarnings.slice(0, 6).map((w, i) => (
                        <li key={i} style={{ marginBottom: 2 }}>
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {parserSource === "manual" && parserWarnings.length > 0 && (
                <div
                  style={{
                    padding: 10,
                    marginBottom: 12,
                    borderRadius: 6,
                    border: "1px solid rgba(230, 126, 34, 0.5)",
                    background: "rgba(230, 126, 34, 0.10)",
                    fontSize: 12,
                    color: TEXT_PRIMARY,
                  }}
                >
                  {parserWarnings[0]}
                </div>
              )}

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
                  key={coordsSeedKey}
                  emirate={emirate}
                  initialText={seedText}
                  initialProjection={seedProjection}
                  onChange={setCoords}
                />
              </div>

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

              {/* Affection Plan picker — for the manual-entry fallback
                  path where the file wasn't uploaded during parsing. */}
              {!uploadedPathRef.current && (
                <div style={{ marginTop: 16 }}>
                  <Field label="Affection Plan PDF / image (required)">
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
              )}
              {uploadedPathRef.current && affectionFile && (
                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12 }}>
                  Document on file: {affectionFile.name}
                  {parserSource === "parser" ? " (parsed)" : ""}
                </div>
              )}

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
                    Saving…
                  </span>
                ) : (
                  "Save & continue →"
                )}
              </button>
              <button
                onClick={() => {
                  setMode("init");
                  setParserSource(null);
                  setParserConfidence(null);
                  setParserWarnings([]);
                }}
                style={{
                  ...buttonStyle,
                  marginTop: 8,
                  background: "transparent",
                  border: `1px solid ${BORDER_SUBTLE}`,
                  color: TEXT_DIM,
                }}
              >
                ← Re-upload / re-parse
              </button>
            </>
          )}
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
