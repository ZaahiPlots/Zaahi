"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import FeasibilityCalculator from "./FeasibilityCalculator";
import FeasibilityV6Calculator from "@/components/feasibility/FeasibilityV6Calculator";
import { IS_FEASIBILITY_V6_ENABLED } from "@/lib/feasibility-v6/featureFlag";
import { adaptSidePanelToInput } from "@/lib/feasibility-v6/parcelInput";
import OfferModal from "./OfferModal";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api-fetch";
import { downloadFile } from "@/lib/download";
import { generateSitePlanPdf } from "@/lib/generate-site-plan-pdf";
import { PdfProgressBar } from "./PdfProgressBar";
import { DdaFetchProgress, type DdaFetchPhase } from "./DdaFetchProgress";
// Phase 1 style unification (2026-05-31): the aside container migrates
// to the shared Panel + tokens. Inner content keeps its existing
// styling — Phase 2 will sweep the row colours / chips.
import { Panel } from "@/components/Panel";
import {
  PANEL_BORDER_COLOR,
  RADIUS_EDGE,
  NUMBER_LARGE,
  NUMBER_SMALL,
} from "@/lib/design-tokens";
import { useFormatArea } from "@/lib/area-unit";
import { useFormatPrice } from "@/lib/currency";
import {
  PANEL_WIDTH_DEFAULT,
  clampPanelWidth,
} from "./sidepanel-width";

// rgba(200,169,110,0.9) — translucent solid-gold for primary CTAs
// (founder spec 2026-05-31 Q1). Same hue as the GOLD constant below
// but reads as an accent on glass instead of opaque chrome.
const GOLD_CTA = "rgba(200, 169, 110, 0.9)";

// ZAAHI UI Style Guide — Apple-like glassmorphism over the satellite map.
// Updated 2026-04-16: warm off-white text + gold-tinted lines, matches
// the design tokens in src/app/globals.css (--text-primary, --glass-*).
// Brand + tokens — text/border/dim unified against the login
// reference (src/app/page.tsx). Card opacity is intentionally lifted
// (0.75 below) because the panel sits over a sharp MapLibre canvas
// without the full-screen blur overlay the login card enjoys; matching
// 0.3 would render the body text against live tiles. Same logic for
// blur(24px) saturate — readability over an unblurred map.
const GOLD = "#C8A96E";
const GOLD_TEXT = "#e8d5a8";
const NAVY = "#0A1628";
const TXT = "#FFFFFF";
const DIM = "rgba(245, 241, 232, 0.75)";
const SUBTLE = "rgba(255, 255, 255, 0.5)";
const LINE = "rgba(255, 255, 255, 0.1)";

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

function ddaFetchBtnStyle(busy: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.04em",
    padding: "4px 10px",
    borderRadius: 4,
    border: `1px solid ${busy ? "rgba(200,169,110,0.2)" : "rgba(200,169,110,0.4)"}`,
    background: busy ? "rgba(255,255,255,0.04)" : "rgba(200,169,110,0.10)",
    color: "#C8A96E",
    cursor: busy ? "wait" : "pointer",
    fontFamily: "inherit",
    transition: "border-color 150ms ease, background 150ms ease",
  };
}

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

export interface ParcelDetail {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  status: string;
  area: number;
  currentValuation: string | null;
  // JV signal — when true and currentValuation is null, the price block
  // is replaced with "Price on request — JV terms negotiable" and a gold
  // "Open to JV" badge appears next to the Land Use section title.
  openToJV?: boolean;
  // Optional JSON-encoded JV term sheet. When present (and openToJV is
  // true) the SidePanel renders an expandable "JV Terms" section with
  // jvType / gfaSharing / landowner+developer share / commission. Listings
  // marked openToJV but without a term sheet (e.g. Plot 3261270) leave
  // this null and the section is not rendered.
  jvDetails?: string | null;
  latitude: number | null;
  longitude: number | null;
  geometry: GeoJSON.Polygon | null;
  affectionPlans: Plan[];
}

interface JvTerms {
  jvType?: string;
  landCost?: string;
  gfaSharing?: string;
  basis?: string;
  landownerShareSqm?: number;
  landownerShareSqft?: number;
  developerShareSqm?: number;
  developerShareSqft?: number;
  commissionPct?: number;
  commissionBasis?: string;
}

function parseJvTerms(raw: string | null | undefined): JvTerms | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as JvTerms;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function aedFromFils(fils: string | null): number | null {
  if (!fils) return null;
  return Number(BigInt(fils)) / 100;
}

export default function SidePanel({
  parcelId,
  onClose,
  mapRef,
  directData,
  renderFooter,
  width,
  onWidthChange,
}: {
  parcelId: string | null;
  onClose: () => void;
  mapRef?: { current: MLMap | null };
  /** When provided, the panel skips the /api/parcels/[id] fetch and
   *  uses this preloaded shape instead. Used by VaultSidePanelAdapter
   *  to feed vault entries through the exact same render pipeline. */
  directData?: ParcelDetail | null;
  /** When provided, replaces the default "Start Negotiation" sticky CTA
   *  with the caller-supplied node. Lets the vault wrapper inject its
   *  Pipeline / Owner contact / Activity sections without forking the
   *  rest of the panel. */
  renderFooter?: (data: ParcelDetail) => React.ReactNode;
  /** Desktop panel width in px. Controlled by the parent so the value
   *  survives open/close cycles and stays in sync with the vault
   *  adapter's loading/error states. Falls back to PANEL_WIDTH_DEFAULT
   *  when omitted (e.g. callers that don't wire up resize). */
  width?: number;
  /** Setter for the controlled width. When omitted, the drag handle is
   *  not rendered (the panel becomes effectively non-resizable). */
  onWidthChange?: (w: number) => void;
}) {
  const [data, setData] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  // User-chosen area unit. Subscribes to the dashboard Settings →
  // Area Unit toggle in real time — sqft (Dubai market default) or
  // m² (rest of world). Display-only; internal storage stays sqft.
  const fmtA = useFormatArea();
  // User-chosen currency (AED / USD). Same shape — display-only,
  // BigInt storage in fils stays AED.
  const fmtP = useFormatPrice();
  // Drag-resize state — `isDesktop` gates the inline width / drag
  // handle (mobile still uses the bottom-sheet layout). `isResizing`
  // suppresses the 150ms width transition during drag so the panel
  // tracks the cursor instead of lagging behind by one animation
  // frame; it flips back on at pointerup so subsequent width changes
  // (e.g. double-click reset) animate.
  const [isDesktop, setIsDesktop] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [feasOpen, setFeasOpen] = useState(false);
  const [jvOpen, setJvOpen] = useState(true); // default open — the JV terms are the headline of the listing
  const [offerOpen, setOfferOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [guidelinesBusy, setGuidelinesBusy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  // Trigger DDA refresh from inside the panel. Calls seed-dda with the
  // current parcel's plotNumber and walks the user through three
  // labelled phases — Fetching → Parsing → Saving → Done. The actual
  // POST is one shot; the intermediate labels are client-side timers
  // sized to typical DDA latency so the founder sees something move.
  const [ddaPhase, setDdaPhase] = useState<DdaFetchPhase>("idle");
  const [ddaErr, setDdaErr] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Detect the sm breakpoint via matchMedia — the inline width style
  // only applies on desktop. At < sm the panel is a bottom sheet
  // (left:0 right:0) and a width override would conflict with that
  // layout. matchMedia listens for breakpoint crossings so a user
  // resizing the browser between mobile and desktop sees the right
  // shape without a refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    // Direct-data path (vault wrapper) bypasses the API fetch entirely.
    if (directData) {
      setData(directData);
      setLoading(false);
      setDocsOpen(false);
      setFeasOpen(false);
      setJvOpen(true);
      setIsFavorite(false);
      setDdaPhase("idle");
      setDdaErr(null);
      return;
    }
    if (!parcelId) return;
    setLoading(true);
    setData(null);
    setDocsOpen(false);
    setFeasOpen(false);
    setJvOpen(true);
    setIsFavorite(false);
    setDdaPhase("idle");
    setDdaErr(null);
    apiFetch(`/api/parcels/${parcelId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [parcelId, directData]);

  async function triggerDdaFetch() {
    if (!data?.plotNumber || ddaPhase === "fetching" || ddaPhase === "parsing" || ddaPhase === "saving") return;
    setDdaErr(null);
    setDdaPhase("fetching");
    // Phase timers — sized to typical DDA latency (~3–6 s end-to-end).
    // We bail on advance if the POST already resolved (success / error
    // flipped phase to done / error in the meantime).
    const t1 = window.setTimeout(() => setDdaPhase((p) => p === "fetching" ? "parsing" : p), 1500);
    const t2 = window.setTimeout(() => setDdaPhase((p) => p === "parsing" ? "saving" : p), 3000);
    try {
      const r = await apiFetch("/api/parcels/seed-dda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plotNumber: data.plotNumber }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      setDdaPhase("done");
      // Reload the parcel after a brief Done flash, then drop the bar.
      window.setTimeout(async () => {
        if (parcelId) {
          const rr = await apiFetch(`/api/parcels/${parcelId}`);
          if (rr.ok) setData(await rr.json());
        }
        setDdaPhase("idle");
      }, 900);
    } catch (e) {
      setDdaErr(e instanceof Error ? e.message : "unknown");
      setDdaPhase("error");
      // Auto-clear the error state after a few seconds.
      window.setTimeout(() => setDdaPhase("idle"), 4000);
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    }
  }

  // Fetch favourite state whenever the parcel changes. Silent on errors
  // (favourites are a nice-to-have, shouldn't block the panel).
  useEffect(() => {
    if (!parcelId || !signedIn) { setIsFavorite(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/me/favorites");
        if (!r.ok) return;
        const json = (await r.json()) as { items: Array<{ parcel: { id: string } }> };
        if (!cancelled) {
          setIsFavorite(json.items.some((x) => x.parcel.id === parcelId));
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [parcelId, signedIn]);

  async function toggleFavorite() {
    if (!parcelId || !signedIn || favoriteBusy) return;
    setFavoriteBusy(true);
    const nextState = !isFavorite;
    setIsFavorite(nextState); // optimistic
    try {
      await apiFetch(`/api/me/favorites/${parcelId}`, {
        method: nextState ? "POST" : "DELETE",
      });
    } catch {
      setIsFavorite(!nextState); // rollback
    } finally {
      setFavoriteBusy(false);
    }
  }

  const open = parcelId != null || directData != null;
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
  // Per-sqft (Plot / Max GFA) rendering. fmtP already handles AED /
  // USD conversion via the user's currency preference; null guards
  // mirror the earlier helper.
  const fmtPerSqft = (n: number | null): string => fmtP(n) ?? "—";

  // Effective width — falls back to the historical 320 px default
  // when no parent wires up the controlled value. Mobile bottom-sheet
  // ignores this entirely (see isDesktop gate below).
  const effectiveWidth = width ?? PANEL_WIDTH_DEFAULT;
  // Width transition is normally 150 ms ease (smooth reset / breakpoint
  // crossings), but suppressed during drag so the cursor leads the
  // panel pixel-for-pixel. transform stays on the existing 300 ms
  // transition (slide-in animation) — we merge the two via inline
  // style so they don't fight.
  const widthTransition = isResizing
    ? "transform 300ms ease-out"
    : "transform 300ms ease-out, width 150ms ease";

  return (
    <Panel
      as="aside"
      radius={RADIUS_EDGE}
      noShadow
      style={{
        // SidePanel is flush against the right viewport edge: no all-around
        // border, only a left edge; and a direction-aware drop shadow
        // pushing visually inward from the right (so it doesn't paint over
        // the map underneath). Panel's PANEL_BG + PANEL_BLUR come for free.
        border: "none",
        borderLeft: `1px solid ${PANEL_BORDER_COLOR}`,
        boxShadow: "-12px 0 48px rgba(0, 0, 0, 0.4)",
        color: TXT,
        // Inline width applies on desktop only; on mobile the panel is
        // a bottom sheet whose width is driven by left-0/right-0.
        width: isDesktop ? effectiveWidth : undefined,
        transition: widthTransition,
      }}
      // Mobile (< sm): bottom sheet — slides up from the bottom, takes
      // the bottom 85% of the viewport, rounded top corners + a small
      // drag handle. Desktop (sm+): the original right-side panel.
      // The transform classes are layered so the sm: variant overrides
      // the mobile y-translate with a horizontal slide. `border-gray-200`
      // matches the LINE constant (#E5E7EB) — Tailwind JIT can't see
      // arbitrary `[${LINE}]` interpolations, so we use a static class.
      // Phase 2 2026-05-31: dropped sm:w-[320px] — width is driven by
      // the inline style above so the parent's controlled value (or
      // its localStorage-restored saved value) wins.
      className={`absolute z-20 overflow-y-auto transition-transform duration-300 ease-out bottom-0 left-0 right-0 max-h-[85vh] h-[85vh] rounded-t-2xl border-t border-gray-200 sm:top-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-full sm:max-h-screen sm:rounded-none sm:border-t-0 sm:border-l ${
        open
          ? "translate-y-0 sm:translate-y-0 sm:translate-x-0"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full"
      }`}
    >
      {/* Drag-resize handle — desktop only. Pointer-event based so the
       *  same code path covers mouse + iPad touch. Double-click resets
       *  the panel to the 320 px default (Q2 founder spec 2026-05-31). */}
      {isDesktop && onWidthChange && (
        <DragHandle onResize={onWidthChange} onResizingChange={setIsResizing} />
      )}
      {/* Mobile drag handle — hidden on sm+ */}
      <div className="sm:hidden flex justify-center pt-2 pb-1">
        <div style={{ width: 36, height: 4, borderRadius: 2, background: LINE }} />
      </div>
      <div
        className="sticky top-0 px-4 py-3 flex items-center gap-2"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
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
              <div style={{ color: SUBTLE, fontSize: 12 }} className="truncate">
                {data.district} · {data.emirate}
              </div>
            </>
          ) : (
            <div style={{ color: SUBTLE, fontSize: 11 }}>{loading ? "Loading…" : ""}</div>
          )}
        </div>
        {data && signedIn && parcelId && (
          <button
            onClick={toggleFavorite}
            disabled={favoriteBusy}
            title={isFavorite ? "Remove from favourites" : "Save to favourites"}
            aria-label={isFavorite ? "Remove from favourites" : "Save to favourites"}
            style={{
              background: isFavorite ? "rgba(230, 57, 70, 0.15)" : "transparent",
              border: `1px solid ${isFavorite ? "rgba(230, 57, 70, 0.5)" : LINE}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: favoriteBusy ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 150ms ease, border-color 150ms ease",
              fontFamily: "inherit",
              fontSize: 14,
              color: isFavorite ? "#F87171" : SUBTLE,
            }}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        )}
      </div>

      {data && (() => {
        // JV listings: openToJV=true with no currentValuation → swap the AED
        // total for a "Price on request — JV terms negotiable" line. The
        // backing field is owner-set per CLAUDE.md "Цена ТОЛЬКО ВРУЧНУЮ" —
        // we never fabricate a number on render, just adjust copy.
        const isJvNoPrice = !!data.openToJV && data.currentValuation == null;
        return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
          {/* Price block — total + per-sqft computed for display only */}
          <div style={{ paddingBottom: 10, borderBottom: `1px solid ${LINE}` }}>
            <div style={{ color: SUBTLE, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>
              {isJvNoPrice ? "Price on Request" : "Total Price"}
            </div>
            <div
              style={
                isJvNoPrice
                  ? {
                      color: GOLD,
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.25,
                    }
                  : {
                      // Phase A 2026-05-31: NUMBER_LARGE (28 / 800 /
                      // -0.02em / tabular-nums). Fixed the -0.2em
                      // copy-error that was crowding big AED figures.
                      ...NUMBER_LARGE,
                      color: GOLD,
                    }
              }
            >
              {isJvNoPrice ? "Price on request — JV terms negotiable" : (fmtP(aed) ?? "—")}
            </div>
            {/* Per-sqft rows. Plot is always shown when we have an area;
                GFA is only shown when DDA gave us a Max GFA. Phase A:
                14 px tabular-nums via NUMBER_SMALL so the two rows
                align under the headline AED. */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {pricePerSqftPlot != null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ color: SUBTLE, fontSize: 12 }}>Per sqft (Plot)</span>
                  <span style={{ ...NUMBER_SMALL, color: TXT }}>{fmtPerSqft(pricePerSqftPlot)}</span>
                </div>
              )}
              {pricePerSqftGfa != null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ color: SUBTLE, fontSize: 12 }}>Per sqft (Max GFA)</span>
                  <span style={{ ...NUMBER_SMALL, color: TXT }}>{fmtPerSqft(pricePerSqftGfa)}</span>
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
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
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
            <PdfProgressBar busy={pdfBusy} />
          </div>

          {/* JV Terms — only when openToJV is set AND a structured term
              sheet was attached. Listings flagged openToJV without a sheet
              (e.g. Plot 3261270) silently skip this section. */}
          {(() => {
            const jv = data.openToJV ? parseJvTerms(data.jvDetails) : null;
            if (!jv) return null;
            return (
              <div
                style={{
                  background: "rgba(200, 169, 110, 0.06)",
                  border: "1px solid rgba(200, 169, 110, 0.25)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setJvOpen((v) => !v)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    color: GOLD,
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    transition: "color 150ms ease",
                  }}
                  aria-expanded={jvOpen}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 99,
                        background: GOLD,
                        flexShrink: 0,
                      }}
                    />
                    JV Terms
                  </span>
                  <span style={{ color: GOLD }}>{jvOpen ? "▾" : "▸"}</span>
                </button>
                {jvOpen && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                    <Row label="JV Type" v={jv.jvType} />
                    <Row label="Land Cost" v={jv.landCost} />
                    <Row label="GFA Sharing" v={jv.gfaSharing} />
                    <Row label="Basis" v={jv.basis} />
                    <Row
                      label="Landowner Share"
                      v={fmtA(jv.landownerShareSqft, jv.landownerShareSqm)}
                    />
                    <Row
                      label="Developer Share"
                      v={fmtA(jv.developerShareSqft, jv.developerShareSqm)}
                    />
                    <Row
                      label="Commission"
                      v={
                        jv.commissionPct != null
                          ? `${jv.commissionPct}%${jv.commissionBasis ? ` of ${jv.commissionBasis}` : ""}`
                          : null
                      }
                    />
                  </div>
                )}
              </div>
            );
          })()}

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
                  v={fmtA(plan.plotAreaSqft, plan.plotAreaSqm)}
                />
                <Row
                  label="Max GFA"
                  v={fmtA(plan.maxGfaSqft, plan.maxGfaSqm)}
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
                <Section
                  title="Land Use"
                  right={
                    data.openToJV ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: GOLD,
                          background: "rgba(200, 169, 110, 0.12)",
                          border: `1px solid rgba(200, 169, 110, 0.45)`,
                        }}
                        title="Owner is open to a Joint-Venture partnership instead of a straight cash sale."
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 99,
                            background: GOLD,
                            flexShrink: 0,
                          }}
                        />
                        Open to JV
                      </span>
                    ) : undefined
                  }
                >
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
                    {IS_FEASIBILITY_V6_ENABLED ? (
                      <FeasibilityV6Calculator
                        parcel={adaptSidePanelToInput(data, plan, aed ?? 0)}
                        banner="none"
                        mode="sidepanel"
                        // Sprint 2-fast (2026-05-06): all 13 engines unlocked.
                        // Founder accepted "speed > full validation" trade-off.
                        // EngineSelector splits into VALIDATED (Residential,
                        // Office) and RESEARCH DEFAULTS optgroups; engines in
                        // the research group carry an italic disclaimer below
                        // the source citation. As founder ratifies more
                        // engines, flip their `validated:` field in
                        // src/lib/feasibility-v6/engines.ts.
                      />
                    ) : (
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
                    )}
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
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        textAlign: "left",
                        fontSize: 12,
                        color: GOLD,
                        padding: "4px 8px",
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <DocIcon />
                      <span>Affection Plan (PDF)</span>
                    </button>
                    {/* New "Plot Details" button — DDA's
                        title="Download Plot Guidelines" Salesforce PDF.
                        Only rendered when the URL exists for THIS plot
                        (backfilled by scripts/backfill-plot-guidelines.ts).
                        Routed through /api/parcels/[id]/plot-guidelines so
                        the same Bearer-token + downloadFile flow works. */}
                    {plan.plotGuidelinesUrl && (
                      <>
                        <button
                          type="button"
                          disabled={guidelinesBusy}
                          onClick={async () => {
                            if (!data || guidelinesBusy) return;
                            setGuidelinesBusy(true);
                            try {
                              await downloadFile(
                                `/api/parcels/${data.id}/plot-guidelines`,
                                `${data.plotNumber}-plot-details.pdf`,
                              );
                            } catch (e) {
                              console.error("[plot-guidelines-download]", e);
                              alert("Could not download Plot Details. Try again or contact support.");
                            } finally {
                              setGuidelinesBusy(false);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            textAlign: "left",
                            fontSize: 12,
                            color: GOLD,
                            padding: "4px 8px",
                            background: "transparent",
                            border: 0,
                            cursor: guidelinesBusy ? "wait" : "pointer",
                            opacity: guidelinesBusy ? 0.7 : 1,
                            fontFamily: "inherit",
                          }}
                        >
                          <DocIcon />
                          <span>{guidelinesBusy ? "Downloading…" : "Plot Details (PDF)"}</span>
                        </button>
                        <div style={{ padding: "0 8px" }}>
                          <PdfProgressBar busy={guidelinesBusy} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{
                paddingTop: 6, borderTop: `1px solid ${LINE}`,
              }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  Source: {plan.source} · {plan.fetchedAt.slice(0, 10)}
                </span>
              </div>
              {/* "↻ Refresh from DDA" button removed per founder spec
                  2026-05-31 — the per-plot refresh affordance shouldn't
                  live in the public SidePanel. triggerDdaFetch + the
                  DdaFetchProgress component stay in place so the
                  upcoming admin-side bulk-refresh tool can reuse them. */}
              {/* Spacer so sticky CTA never covers the last row */}
              <div style={{ height: 72 }} />
            </>
          ) : (
            <div>
              <p style={{ color: SUBTLE, marginBottom: 10 }}>
                No affection plan loaded for this parcel.
              </p>
              <button
                type="button"
                onClick={triggerDdaFetch}
                disabled={!data?.plotNumber || (ddaPhase !== "idle" && ddaPhase !== "error")}
                style={{
                  ...ddaFetchBtnStyle(ddaPhase !== "idle" && ddaPhase !== "error"),
                  padding: "8px 14px",
                  fontSize: 11,
                }}
              >
                ↓ Fetch from DDA
              </button>
              <DdaFetchProgress phase={ddaPhase} error={ddaErr} />
            </div>
          )}
        </div>
        );
      })()}

      {/* Caller-supplied footer wins over the default Start Negotiation
          CTA. Used by VaultSidePanelAdapter to inject its Pipeline +
          Owner contact + Broker notes + Activity stack. */}
      {data && renderFooter ? (
        renderFooter(data)
      ) : data && signedIn && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 14,
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
              border: `1px solid ${GOLD}`,
              background: GOLD_CTA,
              color: NAVY,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 8px 28px rgba(200, 169, 110, 0.3)",
              transition: "background 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200, 169, 110, 1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = GOLD_CTA;
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
    </Panel>
  );
}

// Drag handle for SidePanel left edge. 6 px wide hit zone with a gold
// tint on hover/drag. PointerEvents (not MouseEvents) so the same
// code path handles desktop mouse + iPad touch. setPointerCapture
// keeps mousemove flowing even if the cursor briefly leaves the 6 px
// strip during a fast drag.
//
// Width math: dragging LEFT (cursor moves toward smaller x) widens
// the panel — `delta = startX - currentX`. clampPanelWidth applies
// the MIN / MAX rules. The new width is reported up via onResize
// every frame; the parent's setState batches and re-renders the
// panel. isResizing flag flips to true on pointerdown and back on
// pointerup so the parent can suppress the 150 ms width transition
// during drag.
function DragHandle({
  onResize,
  onResizingChange,
}: {
  onResize: (w: number) => void;
  onResizingChange: (resizing: boolean) => void;
}) {
  const startRef = useRef<{ x: number; w: number; id: number } | null>(null);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize side panel"
      title="Drag to resize · double-click to reset"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        cursor: "col-resize",
        zIndex: 31,
        userSelect: "none",
        background: "transparent",
        transition: "background 120ms ease",
      }}
      onPointerDown={(e) => {
        // Left button only — right-click context menu shouldn't start
        // a drag. Touch / pen pointers fall through (button === 0).
        if (e.button !== 0) return;
        e.preventDefault();
        const el = e.currentTarget;
        try { el.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
        const panel = el.parentElement;
        const panelW =
          panel?.getBoundingClientRect().width ?? PANEL_WIDTH_DEFAULT;
        startRef.current = { x: e.clientX, w: panelW, id: e.pointerId };
        el.style.background = "rgba(200, 169, 110, 0.3)";
        onResizingChange(true);
      }}
      onPointerMove={(e) => {
        const start = startRef.current;
        if (!start || start.id !== e.pointerId) return;
        const delta = start.x - e.clientX;
        const next = clampPanelWidth(start.w + delta, window.innerWidth);
        onResize(next);
      }}
      onPointerUp={(e) => {
        const start = startRef.current;
        if (!start || start.id !== e.pointerId) return;
        const el = e.currentTarget;
        try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        startRef.current = null;
        el.style.background = "transparent";
        onResizingChange(false);
      }}
      onPointerCancel={(e) => {
        if (!startRef.current) return;
        const el = e.currentTarget;
        try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        startRef.current = null;
        el.style.background = "transparent";
        onResizingChange(false);
      }}
      onDoubleClick={() => onResize(PANEL_WIDTH_DEFAULT)}
      onMouseEnter={(e) => {
        if (!startRef.current) {
          e.currentTarget.style.background = "rgba(200, 169, 110, 0.3)";
        }
      }}
      onMouseLeave={(e) => {
        if (!startRef.current) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    />
  );
}

// Document icon — minimalist outline glyph (Phase B 2026-05-31).
// Replaces 📄 / 📑 emoji in the Affection Plan + Plot Details PDF
// buttons. Inherits currentColor so callers control the tint
// (GOLD on the SidePanel buttons). Sized to read at the 12 px button
// line-height without throwing off baseline alignment.
function DocIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="14 3 14 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div style={{
          color: "rgba(255, 255, 255, 0.35)",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}>
          {title}
        </div>
        {right}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | null | undefined }) {
  if (v == null) return null;
  // Phase A 2026-05-31: value side switched to NUMBER_SMALL (14 px /
  // 600 / tabular-nums) so dimension columns (Plot Area, Max GFA, FAR,
  // Floors, etc) align vertically and read clearly. Label stays at a
  // dimmer 12 px so the eye anchors on the figure.
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, lineHeight: 1.4 }}>
      <span style={{ color: SUBTLE, fontSize: 12 }}>{label}</span>
      <span style={{ ...NUMBER_SMALL, color: TXT, textAlign: "right" }}>{v}</span>
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
            fontSize: 11,
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
