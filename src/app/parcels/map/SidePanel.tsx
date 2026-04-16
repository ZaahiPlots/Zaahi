"use client";
import { useEffect, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import FeasibilityCalculator from "./FeasibilityCalculator";
import OfferModal from "./OfferModal";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api-fetch";
import { downloadFile } from "@/lib/download";
import { generateSitePlanPdf } from "@/lib/generate-site-plan-pdf";

// ZAAHI UI Style Guide — Apple-like glassmorphism over the satellite map.
// Updated 2026-04-16: warm off-white text + gold-tinted lines, matches
// the design tokens in src/app/globals.css (--text-primary, --glass-*).
const GOLD = "#C8A96E";
const GOLD_TEXT = "#e8d5a8";
const NAVY = "#1A1A2E";
const TXT = "#f5f1e8";
const DIM = "rgba(245, 241, 232, 0.75)";
const SUBTLE = "rgba(245, 241, 232, 0.55)";
const LINE = "rgba(200, 169, 110, 0.15)";

// APPROVED by founder 2026-04-11. 9 canonical categories. NEVER add,
// remove, or recolor without explicit founder approval. Mirrors
// ZAAHI_LANDUSE_COLOR in src/app/parcels/map/page.tsx so the indicator
// dot in the side-panel land-use list matches the 3D extrusion on the
// map. Source-of-truth in CLAUDE.md "Цвета по Land Use".
const LANDUSE_COLORS: Record<string, string> = {
  RESIDENTIAL:           "#2D6A4F",
  COMMERCIAL:            "#1B4965",
  MIXED_USE:             "#6B4C9A",
  "MIXED USE":           "#6B4C9A",
  HOTEL:                 "#9B2226",
  HOSPITALITY:           "#9B2226",
  INDUSTRIAL:            "#495057",
  WAREHOUSE:             "#495057",
  EDUCATIONAL:           "#0077B6",
  EDUCATION:             "#0077B6",
  HEALTHCARE:            "#E63946",
  AGRICULTURAL:          "#606C38",
  AGRICULTURE:           "#606C38",
  FUTURE_DEVELOPMENT:    "#C8A96E",
  "FUTURE DEVELOPMENT":  "#C8A96E",
};

function fmtMonthYear(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface Plan {
  projectName: string | null;
  community: string | null;
  masterDeveloper: string | null;
  oldNumber: string | null;
  plotAreaSqm: number | null;
  plotAreaSqft: number | null;
  maxGfaSqm: number | null;
  maxGfaSqft: number | null;
  maxHeightCode: string | null;
  maxFloors: number | null;
  maxHeightMeters: number | null;
  far: number | null;
  setbacks: Array<{ side: number; building: number | null; podium: number | null }> | null;
  landUseMix: Array<{ category: string; sub: string; areaSqm: number | null }> | null;
  sitePlanIssue: string | null;
  sitePlanExpiry: string | null;
  notes: string | null;          // plain-language rewritten by /api/parcels/[id]
  notesOriginal: string | null;  // raw DDA text
  // Optional Salesforce URL for the "Plot Guidelines" PDF that DDA
  // surfaces alongside the existing "Plot Details" download. When
  // present, the SidePanel renders a second download button.
  plotGuidelinesUrl: string | null;
  source: string;
  fetchedAt: string;
  // Optional bag of extra fields from the seed/DDA import — we look for
  // `authority` here when rendering the Site Plan PDF header.
  raw: { authority?: string | null } | null;
}

interface ParcelDetail {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  status: string;
  area: number;
  currentValuation: string | null;
  latitude: number | null;
  longitude: number | null;
  geometry: GeoJSON.Polygon | null;
  affectionPlans: Plan[];
}

function aedFromFils(fils: string | null): number | null {
  if (!fils) return null;
  return Number(BigInt(fils)) / 100;
}
function fmtBigAed(aed: number | null): string {
  if (aed == null) return "—";
  if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(1)}M AED`;
  if (aed >= 1_000) return `${(aed / 1_000).toFixed(0)}K AED`;
  return `${aed} AED`;
}

export default function SidePanel({
  parcelId,
  onClose,
  mapRef,
}: {
  parcelId: string | null;
  onClose: () => void;
  mapRef?: { current: MLMap | null };
}) {
  const [data, setData] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [feasOpen, setFeasOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!parcelId) return;
    setLoading(true);
    setData(null);
    setDocsOpen(false);
    setFeasOpen(false);
    apiFetch(`/api/parcels/${parcelId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [parcelId]);

  const open = parcelId != null;
  const plan = data?.affectionPlans?.[0] ?? null;
  const aed = aedFromFils(data?.currentValuation ?? null);
  // Per CLAUDE.md "Цена участка": currentValuation is the SOURCE OF
  // TRUTH (set manually from the founder's Excel, the Add Plot flow,
  // or the owner's profile). Per-sqft values are computed for display
  // only — never written back to the DB, never used to derive the
  // total price.
  const plotAreaSqft = plan?.plotAreaSqft ?? data?.area ?? null;
  const gfaSqft = plan?.maxGfaSqft ?? null;
  const pricePerSqftPlot =
    aed != null && plotAreaSqft && plotAreaSqft > 0 ? aed / plotAreaSqft : null;
  const pricePerSqftGfa =
    aed != null && gfaSqft && gfaSqft > 0 ? aed / gfaSqft : null;
  const fmtPerSqft = (n: number | null): string =>
    n == null ? "—" : `${Math.round(n).toLocaleString("en-US")} AED`;

  return (
    <aside
      style={{
        background: "rgba(10, 22, 40, 0.75)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        borderLeft: "1px solid rgba(200, 169, 110, 0.15)",
        boxShadow: "-12px 0 48px rgba(0, 0, 0, 0.5), inset 1px 0 0 rgba(255, 255, 255, 0.08)",
        color: TXT,
      }}
      // Mobile (< sm): bottom sheet — slides up from the bottom, takes
      // the bottom 85% of the viewport, rounded top corners + a small
      // drag handle. Desktop (sm+): the original right-side panel.
      // The transform classes are layered so the sm: variant overrides
      // the mobile y-translate with a horizontal slide. `border-gray-200`
      // matches the LINE constant (#E5E7EB) — Tailwind JIT can't see
      // arbitrary `[${LINE}]` interpolations, so we use a static class.
      className={`absolute z-20 overflow-y-auto transition-transform duration-300 ease-out bottom-0 left-0 right-0 max-h-[85vh] h-[85vh] rounded-t-2xl border-t border-gray-200 sm:top-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-full sm:max-h-screen sm:w-[350px] sm:rounded-none sm:border-t-0 sm:border-l ${
        open
          ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full"
      }`}
    >
      {/* Mobile drag handle — hidden on sm+ */}
      <div className="sm:hidden flex justify-center pt-2 pb-1">
        <div style={{ width: 36, height: 4, borderRadius: 2, background: LINE }} />
      </div>
      <div
        className="sticky top-0 px-4 py-3 flex items-center gap-2"
        style={{
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          borderBottom: `1px solid ${LINE}`,
          zIndex: 5,
        }}
      >
        <button
          onClick={onClose}
          style={{ color: SUBTLE, fontSize: 18, lineHeight: 1, background: "none", border: 0, cursor: "pointer" }}
        >
          ×
        </button>
        <div className="flex-1 min-w-0">
          {data ? (
            <>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, lineHeight: 1.1 }} className="truncate">
                Plot {data.plotNumber}
              </div>
              <div style={{ color: SUBTLE, fontSize: 10 }} className="truncate">
                {data.district} · {data.emirate}
              </div>
            </>
          ) : (
            <div style={{ color: SUBTLE, fontSize: 11 }}>{loading ? "Loading…" : ""}</div>
          )}
        </div>
      </div>

      {data && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
          {/* Price block — total + per-sqft computed for display only */}
          <div style={{ paddingBottom: 10, borderBottom: `1px solid ${LINE}` }}>
            <div style={{ color: SUBTLE, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>
              Total Price
            </div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>
              {fmtBigAed(aed)}
            </div>
            {/* Per-sqft rows. Plot is always shown when we have an area;
                GFA is only shown when DDA gave us a Max GFA. */}
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {pricePerSqftPlot != null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: SUBTLE }}>Per sqft (Plot)</span>
                  <span style={{ color: TXT, fontWeight: 600 }}>{fmtPerSqft(pricePerSqftPlot)}</span>
                </div>
              )}
              {pricePerSqftGfa != null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: SUBTLE }}>Per sqft (Max GFA)</span>
                  <span style={{ color: TXT, fontWeight: 600 }}>{fmtPerSqft(pricePerSqftGfa)}</span>
                </div>
              )}
            </div>

            {/* Download Site Plan — glassmorphism, gold border. Renders a
                one-page branded PDF from the current parcel data + a
                snapshot of the current map canvas (polygon preview as
                a fallback when the map is unavailable). */}
            <button
              type="button"
              disabled={pdfBusy || !data}
              onClick={async () => {
                if (!data) return;
                setPdfBusy(true);
                try {
                  await generateSitePlanPdf({
                    parcel: {
                      id: data.id,
                      plotNumber: data.plotNumber,
                      district: data.district,
                      emirate: data.emirate,
                      area: data.area,
                      currentValuation: data.currentValuation,
                      geometry: data.geometry,
                      latitude: data.latitude,
                      longitude: data.longitude,
                    },
                    plan: plan
                      ? {
                          projectName: plan.projectName,
                          community: plan.community,
                          masterDeveloper: plan.masterDeveloper,
                          plotAreaSqm: plan.plotAreaSqm,
                          plotAreaSqft: plan.plotAreaSqft,
                          maxGfaSqm: plan.maxGfaSqm,
                          maxGfaSqft: plan.maxGfaSqft,
                          maxHeightCode: plan.maxHeightCode,
                          maxFloors: plan.maxFloors,
                          maxHeightMeters: plan.maxHeightMeters,
                          far: plan.far,
                          setbacks: plan.setbacks,
                          landUseMix: plan.landUseMix,
                          notes: plan.notes,
                        }
                      : null,
                    authority: plan?.raw?.authority ?? null,
                    map: mapRef?.current ?? null,
                  });
                } catch (e) {
                  console.error("[site-plan-pdf]", e);
                  alert("Could not generate the Site Plan PDF. Please try again.");
                } finally {
                  setPdfBusy(false);
                }
              }}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid rgba(200,169,110,0.3)`,
                color: GOLD,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                cursor: pdfBusy ? "wait" : "pointer",
                opacity: pdfBusy ? 0.7 : 1,
                backdropFilter: "blur(24px) saturate(150%)",
                WebkitBackdropFilter: "blur(24px) saturate(150%)",
                transition: "background 150ms ease, border-color 150ms ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (pdfBusy) return;
                e.currentTarget.style.background = "rgba(200,169,110,0.2)";
                e.currentTarget.style.borderColor = GOLD;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{pdfBusy ? "Generating…" : "Download Site Plan"}</span>
            </button>
          </div>

          {plan ? (
            <>
              <Section title="Project">
                <Row label="Name" v={plan.projectName} />
                <Row label="Community" v={plan.community} />
                <Row label="Master Dev" v={plan.masterDeveloper} />
              </Section>

              <Section title="Dimensions">
                <Row
                  label="Plot Area"
                  v={
                    plan.plotAreaSqft || plan.plotAreaSqm
                      ? [
                          plan.plotAreaSqft ? `${Math.round(plan.plotAreaSqft).toLocaleString()} ft²` : null,
                          plan.plotAreaSqm ? `${Math.round(plan.plotAreaSqm).toLocaleString()} m²` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : null
                  }
                />
                <Row
                  label="Max GFA"
                  v={
                    plan.maxGfaSqft || plan.maxGfaSqm
                      ? [
                          plan.maxGfaSqft ? `${Math.round(plan.maxGfaSqft).toLocaleString()} ft²` : null,
                          plan.maxGfaSqm ? `${Math.round(plan.maxGfaSqm).toLocaleString()} m²` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : null
                  }
                />
                <Row label="FAR" v={plan.far?.toString()} />
                <Row
                  label="Max Height"
                  v={
                    plan.maxHeightCode || plan.maxFloors != null || plan.maxHeightMeters != null
                      ? [
                          plan.maxHeightCode,
                          plan.maxFloors != null ? `${plan.maxFloors} floors` : null,
                          plan.maxHeightMeters != null ? `~${plan.maxHeightMeters} m` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : null
                  }
                />
              </Section>

              {/* Land Use with colored indicator */}
              {plan.landUseMix && plan.landUseMix.length > 0 && (
                <Section title="Land Use">
                  <ul style={{ display: "flex", flexDirection: "column", gap: 3, margin: 0, padding: 0, listStyle: "none" }}>
                    {plan.landUseMix.map((u, i) => {
                      const color = LANDUSE_COLORS[u.category.toUpperCase().trim()] ?? GOLD;
                      return (
                        <li key={i} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: 2,
                            background: color, flexShrink: 0,
                          }} />
                          <span style={{ color: TXT, fontWeight: 600 }}>{u.category}</span>
                          <span style={{ color: SUBTLE }}>· {u.sub}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {/* Affection Plan dates — issue / expiry on separate rows */}
              {(plan.sitePlanIssue || plan.sitePlanExpiry) && (
                <Section title="Affection Plan">
                  <Row label="Issued" v={fmtMonthYear(plan.sitePlanIssue) || null} />
                  <Row label="Expires" v={fmtMonthYear(plan.sitePlanExpiry) || null} />
                </Section>
              )}

              {/* General notes — straight from DDA's affection plan, raw text */}
              {plan.notes && plan.notes.trim().length > 0 && (
                <NotesBlock rewritten={plan.notes} original={plan.notesOriginal} />
              )}

              {/* Feasibility Calculator — ALWAYS visible. Manual GFA / price entry
                  is supported when DDA data is missing. */}
              <div>
                <button
                  onClick={() => setFeasOpen((v) => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: `1px solid ${GOLD}`,
                    background: "rgba(200,169,110,0.08)",
                    color: GOLD,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  <span>Feasibility Calculator</span>
                  <span>{feasOpen ? "▾" : "▸"}</span>
                </button>
                {feasOpen && (
                  <div style={{ marginTop: 8 }}>
                    <FeasibilityCalculator
                      plotAreaSqft={data.area}
                      plotPriceAed={aed ?? 0}
                      gfaSqft={plan.maxGfaSqft ?? 0}
                      far={plan.far}
                      landUseMix={plan.landUseMix}
                      landUse={
                        plan.landUseMix && plan.landUseMix.length > 1
                          ? "MIXED_USE"
                          : (plan.landUseMix?.[0]?.category ?? "RESIDENTIAL")
                      }
                      maxFloors={plan.maxFloors}
                      community={plan.community}
                      plotNumber={data.plotNumber}
                      district={data.district}
                      projectName={plan.projectName}
                      masterDeveloper={plan.masterDeveloper}
                      maxHeightCode={plan.maxHeightCode}
                      onStartNegotiation={() => setOfferOpen(true)}
                    />
                  </div>
                )}
              </div>

              {/* Documents */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => setDocsOpen((v) => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    fontSize: 11,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${LINE}`,
                    color: TXT,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "background 150ms ease, border-color 150ms ease",
                  }}
                >
                  <span>Documents</span>
                  <span style={{ color: SUBTLE }}>{docsOpen ? "▾" : "▸"}</span>
                </button>
                {docsOpen && (
                  <div style={{ paddingLeft: 8, borderLeft: `1px solid ${LINE}`, display: "flex", flexDirection: "column" }}>
                    {/* Existing "Affection Plan" download — DDA's
                        title="Download Plot Details" PDF, fetched via
                        the /pdf proxy. ALWAYS shown when a parcel is
                        loaded. */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!data) return;
                        // Plain <a href="/api/..."> would 401 because the
                        // PDF endpoint goes through getApprovedUserId.
                        // downloadFile attaches the Bearer token via apiFetch.
                        downloadFile(
                          `/api/parcels/${data.id}/pdf`,
                          `${data.plotNumber}-affection-plan.pdf`,
                        ).catch((e) => {
                          console.error("[pdf-download]", e);
                          alert("Could not download the PDF. Try again or contact support.");
                        });
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        fontSize: 10,
                        color: GOLD,
                        padding: "4px 8px",
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      📄 Affection Plan (PDF)
                    </button>
                    {/* New "Plot Details" button — DDA's
                        title="Download Plot Guidelines" Salesforce PDF.
                        Only rendered when the URL exists for THIS plot
                        (backfilled by scripts/backfill-plot-guidelines.ts).
                        Routed through /api/parcels/[id]/plot-guidelines so
                        the same Bearer-token + downloadFile flow works. */}
                    {plan.plotGuidelinesUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!data) return;
                          downloadFile(
                            `/api/parcels/${data.id}/plot-guidelines`,
                            `${data.plotNumber}-plot-details.pdf`,
                          ).catch((e) => {
                            console.error("[plot-guidelines-download]", e);
                            alert("Could not download Plot Details. Try again or contact support.");
                          });
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          fontSize: 10,
                          color: GOLD,
                          padding: "4px 8px",
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        📑 Plot Details (PDF)
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 9, color: "#9CA3AF", paddingTop: 6, borderTop: `1px solid ${LINE}` }}>
                Source: {plan.source} · {plan.fetchedAt.slice(0, 10)}
              </div>
              {/* Spacer so sticky CTA never covers the last row */}
              <div style={{ height: 72 }} />
            </>
          ) : (
            <p style={{ color: SUBTLE }}>No affection plan loaded for this parcel.</p>
          )}
        </div>
      )}

      {/* Sticky Start Negotiation CTA — always visible at bottom of panel */}
      {data && signedIn && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 14,
            background: "rgba(10, 22, 40, 0.85)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            borderTop: `1px solid ${LINE}`,
            boxShadow: "0 -12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={() => setOfferOpen(true)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "none",
              background: GOLD,
              color: NAVY,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(200, 169, 110, 0.3)",
              transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
          >
            Start Negotiation
          </button>
        </div>
      )}

      {offerOpen && data && (
        <OfferModal
          parcelId={data.id}
          askingPriceAed={aed}
          onClose={() => setOfferOpen(false)}
        />
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | null | undefined }) {
  if (v == null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, lineHeight: 1.4 }}>
      <span style={{ color: SUBTLE }}>{label}</span>
      <span style={{ color: TXT, textAlign: "right" }}>{v}</span>
    </div>
  );
}

// General Notes block. The API returns BOTH a plain-language rewrite
// and the raw DDA original; we render the rewrite by default and let
// the user reveal the raw text if they want to verify.
function NotesBlock({
  rewritten,
  original,
}: {
  rewritten: string | null;
  original: string | null;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const showToggle = !!original && !!rewritten && original.trim() !== rewritten.trim();
  const body = (showOriginal ? original : rewritten) ?? "";
  return (
    <Section title="General Notes">
      <div
        style={{
          fontSize: 11,
          color: TXT,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {body.trim()}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          style={{
            marginTop: 4,
            background: "transparent",
            border: 0,
            padding: 0,
            color: GOLD,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {showOriginal ? "← plain language" : "show original DDA wording"}
        </button>
      )}
    </Section>
  );
}
