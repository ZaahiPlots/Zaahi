"use client";

// ZAAHI Vault — slide-in side panel for clicked vault entries.
//
// Two view modes:
//   • "owner"  → full VaultEntryFull data (broker notes, follow-up,
//                price history, shares, activity)
//   • "share"  → recipient-redacted VaultEntryRecipientView (no
//                brokerNotes / nextFollowUpAt / ownerContact.notes),
//                plus sharedBy header + "Add to my vault" action
//
// Action buttons (Share / Promote / Add to vault) render in Day 8 but
// fire placeholder console messages; Day 10 wires them to the real
// modals.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.4, §6.5, §6.6.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { useAreaUnit, formatAreaWithBoth } from "@/lib/area-unit";
import { ConflictBanner } from "./ConflictBanner";
import { ConflictDetailModal } from "./ConflictDetailModal";
import { ShareModal } from "./ShareModal";
import { PromoteToPublicModal } from "./PromoteToPublicModal";
import { ImportFromShareButton } from "./ImportFromShareButton";
import { useEscapeClose } from "./useEscapeClose";

const GOLD = "#C8A96E";
const BG_GLASS = "rgba(10, 22, 40, 0.78)";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

// AffectionPlan fields from the public Parcel join (when entry has
// publicParcelId). Mirrors the columns selected in
// /api/me/vault/entries/[id] GET. All nullable — only present for
// curated-index hits.
interface AffectionPlanLite {
  plotAreaSqm: number | null;
  plotAreaSqft: number | null;
  maxGfaSqm: number | null;
  maxGfaSqft: number | null;
  maxFloors: number | null;
  maxHeightMeters: number | null;
  maxHeightCode: string | null;
  far: number | null;
  setbacks: unknown;
  landUseMix: unknown;
  buildingStyle: string | null;
  buildingLimitGeometry: unknown;
  sitePlanIssue: string | null;
  sitePlanExpiry: string | null;
  notes: string | null;
  projectName: string | null;
  community: string | null;
  masterDeveloper: string | null;
  plotGuidelinesUrl: string | null;
}

interface OwnerView {
  access: "owner";
  id: string;
  ownerId: string;
  emirate: string;
  district: string;
  plotNumber: string;
  area: number | null;
  landUse: string | null;
  askingPriceFils: string | null;
  ownerContact: { name?: string; phone?: string; email?: string; role?: string; notes?: string } | null;
  brokerNotes: string | null;
  stage: string;
  source: string | null;
  nextFollowUpAt: string | null;
  conflictsWithOthers: boolean;
  conflictedFields: unknown | null;
  promotedAt: string | null;
  promotedParcelId: string | null;
  /** Raw DDA snapshot when entry was sourced via live BASIC_LAND_BASE
   *  lookup (Path 1 fallback for plots not in our curated Parcel index). */
  ddaSnapshot: unknown | null;
  /** AffectionPlan from publicParcel join — present for entries linked
   *  to a curated Parcel row. Used together with ddaSnapshot to render
   *  DIMENSIONS / LAND USE / AFFECTION PLAN sections. */
  affectionPlan: AffectionPlanLite | null;
  addedBy: { id: string; nickname: string | null } | null;
  shares: Array<{
    id: string;
    recipient: { id: string; nickname: string | null };
    permission: string;
    expiresAt: string | null;
    createdAt: string;
    lastViewedAt: string | null;
  }>;
  priceHistory: Array<{
    id: string;
    priceFils: string;
    setByUserId: string;
    source: string;
    note: string | null;
    createdAt: string;
  }>;
  activity: Array<{
    id: string;
    kind: string;
    payload: unknown;
    actor: { id: string; nickname: string | null } | null;
    createdAt: string;
  }>;
}

interface RecipientView {
  access: "share";
  id: string;
  emirate: string;
  district: string;
  plotNumber: string;
  area: number | null;
  landUse: string | null;
  askingPriceFils: string | null;
  ownerContact: { name?: string; phone?: string; email?: string; role?: string } | null;
  stage: string;
  conflictsWithOthers: boolean;
  sharedBy: { id: string; nickname: string | null };
  permission: string;
  shareId: string;
  ddaSnapshot: unknown | null;
  affectionPlan: AffectionPlanLite | null;
}

type EntryView = OwnerView | RecipientView;

interface Props {
  entryId: string;
  mode: "owner" | "share";
  onClose: () => void;
}

export function VaultSidePanelAdapter({ entryId, mode, onClose }: Props) {
  const [view, setView] = useState<EntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  // Esc closes the panel — but only when no inner modal is open
  // (otherwise the modal's own escape handler should win).
  useEscapeClose(
    onClose,
    !showConflictModal && !showShareModal && !showPromoteModal,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Owner uses /api/me/vault/entries/[id]; recipient (or unknown
        // role) uses /api/vault/entries/[id] (polymorphic GET that
        // resolves owner-or-recipient and redacts as needed).
        const url =
          mode === "owner"
            ? `/api/me/vault/entries/${entryId}`
            : `/api/vault/entries/${entryId}`;
        const r = await apiFetch(url);
        if (cancelled) return;
        if (!r.ok) {
          setError(r.status === 404 ? "Not found or no longer accessible." : `Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as EntryView;
        setView(d);
      } catch (e) {
        console.error("[VaultSidePanelAdapter] fetch:", e);
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId, mode]);

  const askingAed =
    view?.askingPriceFils ? Number(BigInt(view.askingPriceFils) / BigInt(100)) : null;

  return (
    <>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={tinyLabelStyle}>
              {view?.access === "owner"
                ? "PRIVATE · only you"
                : view?.access === "share"
                  ? `SHARED BY @${view.sharedBy.nickname ?? "—"}`
                  : "VAULT ENTRY"}
            </div>
            <h2 style={titleStyle}>
              {view ? `Plot ${view.plotNumber} · ${view.district} · ${formatEmirate(view.emirate)}` : "Loading…"}
            </h2>
            {view && view.access === "owner" && view.promotedAt && (
              <div style={{ fontSize: 12, color: GOLD, marginTop: 2 }}>
                ✓ Promoted to public listing
              </div>
            )}
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">×</button>
        </div>

        {loading && <div style={subduedStyle}>Loading…</div>}
        {error && <div style={{ ...subduedStyle, color: "#E63946" }}>{error}</div>}

        {view && view.conflictsWithOthers && (
          <ConflictBanner
            otherCount={countOthers(view)}
            onViewDetails={() => setShowConflictModal(true)}
          />
        )}

        {view && (
          <div style={bodyStyle}>
            <PlotFactsSections view={view} />

            <Section label="Your pipeline">
              <Row label="Stage">{view.stage}</Row>
              <Row label="Asking price">
                {askingAed !== null ? `AED ${askingAed.toLocaleString()}` : "—"}
              </Row>
              {view.access === "owner" && view.source && <Row label="Source">{view.source}</Row>}
              {view.access === "owner" && view.nextFollowUpAt && (
                <Row label="Next follow-up">{new Date(view.nextFollowUpAt).toLocaleString()}</Row>
              )}
            </Section>

            {view.ownerContact && (
              <Section label="Owner contact">
                {view.ownerContact.name && <Row label="Name">{view.ownerContact.name}</Row>}
                {view.ownerContact.phone && <Row label="Phone">{view.ownerContact.phone}</Row>}
                {view.ownerContact.email && <Row label="Email">{view.ownerContact.email}</Row>}
                {view.ownerContact.role && <Row label="Role">{view.ownerContact.role}</Row>}
                {view.access === "owner" && view.ownerContact.notes && (
                  <Row label="Notes">{view.ownerContact.notes}</Row>
                )}
              </Section>
            )}

            {view.access === "owner" && view.brokerNotes && (
              <Section label="Broker notes (private)">
                <div style={{ ...rowValueStyle, whiteSpace: "pre-wrap" }}>{view.brokerNotes}</div>
              </Section>
            )}

            {view.access === "owner" && view.priceHistory.length > 0 && (
              <Section label={`Price history (${view.priceHistory.length})`}>
                {view.priceHistory.slice(0, 5).map((p) => {
                  const aed = Number(BigInt(p.priceFils) / BigInt(100));
                  return (
                    <div key={p.id} style={{ ...rowStyle, fontSize: 12 }}>
                      <div style={rowLabelStyle}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                      <div style={rowValueStyle}>
                        AED {aed.toLocaleString()}
                        {p.note && <span style={{ color: TEXT_DIM, marginLeft: 8 }}>— {p.note}</span>}
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}

            {view.access === "owner" && view.shares.length > 0 && (
              <Section label={`Shared with ${view.shares.length}`}>
                {view.shares.map((s) => (
                  <div key={s.id} style={{ ...rowStyle, fontSize: 12 }}>
                    <div style={rowLabelStyle}>@{s.recipient.nickname ?? "—"}</div>
                    <div style={rowValueStyle}>
                      {s.permission}
                      {s.lastViewedAt && <span style={{ color: TEXT_DIM, marginLeft: 8 }}>· last viewed {timeAgo(s.lastViewedAt)}</span>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {view.access === "owner" && view.activity.length > 0 && (
              <Section label="Activity">
                {view.activity.slice(0, 5).map((a) => (
                  <div key={a.id} style={{ ...rowStyle, fontSize: 12 }}>
                    <div style={rowLabelStyle}>{timeAgo(a.createdAt)}</div>
                    <div style={rowValueStyle}>
                      {formatActivityKind(a.kind)}
                      {a.actor && a.actor.nickname && (
                        <span style={{ color: TEXT_DIM, marginLeft: 6 }}>· @{a.actor.nickname}</span>
                      )}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {view.access === "share" && (
              <Section label="Share">
                <Row label="From">@{view.sharedBy.nickname ?? "—"}</Row>
                <Row label="Permission">{view.permission}</Row>
              </Section>
            )}

            {/* Action buttons (Day 10 — wired to real modals). */}
            <div style={actionRowStyle}>
              {view.access === "owner" && !view.promotedAt && (
                <>
                  <button style={primaryButtonStyle} onClick={() => setShowShareModal(true)}>
                    Share
                  </button>
                  <button style={secondaryButtonStyle} onClick={() => setShowPromoteModal(true)}>
                    Promote to public
                  </button>
                </>
              )}
              {view.access === "share" && (
                <ImportFromShareButton
                  shareId={view.shareId}
                  onImported={() => {
                    // Recipient's vault now has a row for this plot —
                    // close the side panel so they can navigate to /vault
                    // and find it. Parent state-clearing handler keeps
                    // the map clean.
                    onClose();
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showConflictModal && view && (
        <ConflictDetailModal
          emirate={view.emirate}
          district={view.district}
          plotNumber={view.plotNumber}
          onClose={() => setShowConflictModal(false)}
        />
      )}

      {showShareModal && view && view.access === "owner" && (
        <ShareModal
          entryId={view.id}
          entryLabel={`${view.plotNumber} · ${view.district}`}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            // No-op for MVP — Day 12 polish may refresh side-panel
            // share count. Toast notification handled inside the modal.
          }}
        />
      )}

      {showPromoteModal && view && view.access === "owner" && (
        <PromoteToPublicModal
          entryId={view.id}
          entryLabel={`${view.plotNumber} · ${view.district}`}
          initialAskingAed={askingAed}
          onClose={() => setShowPromoteModal(false)}
          onPromoted={() => {
            // Side panel will show "Promoted to public listing" badge on
            // re-fetch; for now just close — parent click handler can
            // refresh the map's vault layer if needed.
            onClose();
          }}
        />
      )}
    </>
  );
}

function countOthers(view: EntryView): number {
  // Server-side conflictedFields includes all participants (incl. caller).
  // For the banner copy, "other users" excludes the caller. Without
  // walking conflictedFields we approximate as 1 — the banner is
  // informational; the modal shows the real list anyway.
  if (view.access !== "owner") return 1;
  const cf = view.conflictedFields as Array<{ values?: Array<unknown> }> | null;
  if (!Array.isArray(cf) || cf.length === 0) return 1;
  // Take max participants across all conflicted fields, subtract 1 (caller).
  const max = cf.reduce(
    (m, f) => Math.max(m, Array.isArray(f.values) ? f.values.length : 0),
    0,
  );
  return Math.max(1, max - 1);
}

function timeAgo(iso: string): string {
  const dt = Date.now() - new Date(iso).getTime();
  if (dt < 60_000) return "just now";
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m ago`;
  if (dt < 86_400_000) return `${Math.floor(dt / 3_600_000)}h ago`;
  return `${Math.floor(dt / 86_400_000)}d ago`;
}

function formatActivityKind(kind: string): string {
  switch (kind) {
    case "CREATED": return "Entry created";
    case "STAGE_CHANGED": return "Stage updated";
    case "PRICE_CHANGED": return "Price updated";
    case "NOTE_ADDED": return "Notes updated";
    case "FOLLOW_UP_LOGGED": return "Follow-up set";
    case "SHARED": return "Shared with a user";
    case "SHARE_REVOKED": return "Share revoked";
    case "VIEWED_BY_RECIPIENT": return "Viewed by recipient";
    case "IMPORTED_FROM_SHARE": return "Imported from share";
    case "PROMOTED_TO_PUBLIC": return "Promoted to public";
    case "CONFLICT_DETECTED": return "Conflict detected";
    case "CONFLICT_RESOLVED": return "Conflict cleared";
    default: return kind;
  }
}

// ── Compositional helpers ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={sectionLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <div style={rowLabelStyle}>{label}</div>
      <div style={rowValueStyle}>{children}</div>
    </div>
  );
}

// ── Plot facts (DIMENSIONS / LAND USE / AFFECTION PLAN / NOTES) ──
//
// Data fallback chain:
//   1. view.affectionPlan (from curated Parcel join) — preferred, clean shape
//   2. view.ddaSnapshot.feature.properties (from live DDA fetch) — fallback
//   3. None — only the YOUR PIPELINE section renders below

function PlotFactsSections({ view }: { view: EntryView }) {
  const facts = derivePlanFacts(view);
  const unit = useAreaUnit();
  if (!facts) return null;

  const plotAreaDisplay = facts.dimensions
    ? formatAreaWithBoth(facts.dimensions.plotAreaSqft, facts.dimensions.plotAreaSqm, unit)
    : null;
  const maxGfaDisplay = facts.dimensions
    ? formatAreaWithBoth(facts.dimensions.maxGfaSqft, facts.dimensions.maxGfaSqm, unit)
    : null;

  return (
    <>
      {facts.dimensions && (
        <Section label="Dimensions">
          {plotAreaDisplay && <Row label="Plot area">{plotAreaDisplay}</Row>}
          {maxGfaDisplay && <Row label="Max GFA">{maxGfaDisplay}</Row>}
          {facts.dimensions.far !== null && (
            <Row label="FAR">{facts.dimensions.far.toFixed(2)}</Row>
          )}
          {facts.dimensions.maxHeight && <Row label="Max height">{facts.dimensions.maxHeight}</Row>}
        </Section>
      )}

      {facts.landUseCategory && (
        <Section label="Land use">
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <span style={landUseTagStyle(facts.landUseCategory)}>
              {prettyLandUseLabel(facts.landUseCategory)}
            </span>
            {facts.landUseSub && (
              <span style={{ fontSize: 12, color: TEXT_DIM }}>{facts.landUseSub}</span>
            )}
          </div>
        </Section>
      )}

      {(facts.sitePlanIssue || facts.sitePlanExpiry) && (
        <Section label="Affection plan">
          {facts.sitePlanIssue && <Row label="Issued">{formatMonthYear(facts.sitePlanIssue)}</Row>}
          {facts.sitePlanExpiry && <Row label="Expires">{formatMonthYear(facts.sitePlanExpiry)}</Row>}
        </Section>
      )}

      {facts.generalNotes && (
        <Section label="General notes">
          <div style={{ ...rowValueStyle, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.55 }}>
            {facts.generalNotes}
          </div>
        </Section>
      )}

      {facts.plotGuidelinesUrl && (
        <Section label="Documents">
          <a
            href={facts.plotGuidelinesUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={downloadLinkStyle}
          >
            ⬇ Download site plan PDF
          </a>
        </Section>
      )}
    </>
  );
}

/** Unified facts extracted from affectionPlan (preferred) or ddaSnapshot. */
interface PlanFacts {
  dimensions: {
    plotAreaSqft: number | null;
    plotAreaSqm: number | null;
    maxGfaSqft: number | null;
    maxGfaSqm: number | null;
    far: number | null;
    maxHeight: string | null;
  } | null;
  landUseCategory: string | null;
  landUseSub: string | null;
  sitePlanIssue: string | null;
  sitePlanExpiry: string | null;
  generalNotes: string | null;
  plotGuidelinesUrl: string | null;
}

function derivePlanFacts(view: EntryView): PlanFacts | null {
  // Path 1: curated Parcel join (AffectionPlan present).
  if (view.affectionPlan) {
    const plan = view.affectionPlan;
    const mix = Array.isArray(plan.landUseMix)
      ? (plan.landUseMix as Array<{ category?: string; sub?: string | null }>)
      : null;
    const first = mix?.[0] ?? null;
    return {
      dimensions: {
        plotAreaSqft: plan.plotAreaSqft,
        plotAreaSqm: plan.plotAreaSqm,
        maxGfaSqft: plan.maxGfaSqft,
        maxGfaSqm: plan.maxGfaSqm,
        far: plan.far,
        maxHeight: plan.maxHeightCode
          ?? (plan.maxFloors ? `G+${Math.max(0, plan.maxFloors - 1)}` : null),
      },
      landUseCategory: first?.category ?? null,
      landUseSub: first?.sub ?? null,
      sitePlanIssue: plan.sitePlanIssue,
      sitePlanExpiry: plan.sitePlanExpiry,
      generalNotes: plan.notes,
      plotGuidelinesUrl: plan.plotGuidelinesUrl,
    };
  }

  // Path 2: live-DDA snapshot (BASIC_LAND_BASE fields).
  if (
    view.ddaSnapshot &&
    typeof view.ddaSnapshot === "object" &&
    "feature" in view.ddaSnapshot
  ) {
    const snap = view.ddaSnapshot as { feature?: { properties?: Record<string, unknown> } };
    const p = snap.feature?.properties ?? {};
    const areaSqm = typeof p.AREA_SQM === "number" ? p.AREA_SQM : null;
    const areaSqft = typeof p.AREA_SQFT === "number" ? p.AREA_SQFT : null;
    const gfaSqm = typeof p.GFA_SQM === "number" ? p.GFA_SQM : null;
    const gfaSqft = typeof p.GFA_SQFT === "number" ? p.GFA_SQFT : null;
    const far = (gfaSqm && areaSqm) ? gfaSqm / areaSqm : null;
    const issueMs = typeof p.SITEPLAN_ISSUE_DATE === "number" ? p.SITEPLAN_ISSUE_DATE : null;
    const expiryMs = typeof p.SITEPLAN_EXPIRY_DATE === "number" ? p.SITEPLAN_EXPIRY_DATE : null;
    return {
      dimensions: {
        plotAreaSqft: areaSqft,
        plotAreaSqm: areaSqm,
        maxGfaSqft: gfaSqft,
        maxGfaSqm: gfaSqm,
        far,
        maxHeight: typeof p.MAX_HEIGHT_FLOORS === "string" ? p.MAX_HEIGHT_FLOORS : null,
      },
      landUseCategory:
        typeof p.LANDUSE_CATEGORY === "string" ? p.LANDUSE_CATEGORY :
        typeof p.MAIN_LANDUSE === "string" ? p.MAIN_LANDUSE :
        null,
      landUseSub: typeof p.SUB_LANDUSE === "string" ? p.SUB_LANDUSE : null,
      sitePlanIssue: issueMs ? new Date(issueMs).toISOString() : null,
      sitePlanExpiry: expiryMs ? new Date(expiryMs).toISOString() : null,
      generalNotes: typeof p.GENERAL_NOTES === "string" && p.GENERAL_NOTES.trim().length > 0
        ? p.GENERAL_NOTES
        : null,
      plotGuidelinesUrl: null, // BASIC_LAND_BASE doesn't surface a PDF URL; only the DIS PlotInfo does
    };
  }

  // Path 3: manual entry — no DDA data, no curated parcel.
  return null;
}

// ── Helpers (UI formatters) ──

const EMIRATE_LABEL: Record<string, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UAQ: "Umm Al Quwain",
  RAK: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};
function formatEmirate(code: string): string {
  return EMIRATE_LABEL[code] ?? code;
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// 9-category palette per CLAUDE.md (founder-ratified 2026-04-11).
const LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#FFD700",
  COMMERCIAL: "#4A90D9",
  MIXED_USE: "#9B59B6",
  "MIXED USE": "#9B59B6",
  HOTEL: "#E67E22",
  HOSPITALITY: "#E67E22",
  INDUSTRIAL: "#708090",
  WAREHOUSE: "#708090",
  EDUCATIONAL: "#1ABC9C",
  EDUCATION: "#1ABC9C",
  HEALTHCARE: "#E74C3C",
  AGRICULTURAL: "#6B8E23",
  AGRICULTURE: "#6B8E23",
  FUTURE_DEVELOPMENT: "#84CC16",
  "FUTURE DEVELOPMENT": "#84CC16",
};
function landUseTagStyle(category: string): React.CSSProperties {
  const key = category.toUpperCase().trim();
  const hex = LANDUSE_COLOR[key] ?? "#6B7280";
  return {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#1A1A2E",
    background: hex,
    border: `1px solid ${hex}`,
  };
}
function prettyLandUseLabel(raw: string): string {
  return raw.replace(/_/g, " ");
}

// ── Styles (CLAUDE.md UI STYLE GUIDE) ──

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 64,
  right: 12,
  bottom: 12,
  width: 380,
  background: BG_GLASS,
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  display: "flex",
  flexDirection: "column",
  zIndex: 22,
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 14px 12px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: `1px solid ${BORDER}`,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 17,
  fontWeight: 700,
  margin: 0,
  marginTop: 4,
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
  width: 28,
  height: 28,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px",
};

const subduedStyle: React.CSSProperties = {
  padding: "16px 14px",
  color: TEXT_DIM,
  fontSize: 13,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: TEXT_DIM,
  marginBottom: 6,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "100px 1fr",
  gap: 8,
  padding: "5px 0",
  fontSize: 13,
};

const rowLabelStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const rowValueStyle: React.CSSProperties = {
  color: TEXT_PRIMARY,
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 14,
  paddingTop: 14,
  borderTop: `1px solid ${BORDER}`,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.15)",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  borderRadius: 8,
  padding: "10px 14px",
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

const downloadLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 12,
  color: GOLD,
  border: `1px solid rgba(200, 169, 110, 0.3)`,
  background: "rgba(200, 169, 110, 0.08)",
  textDecoration: "none",
  letterSpacing: "0.04em",
  transition: "background 150ms ease, border-color 150ms ease",
};
