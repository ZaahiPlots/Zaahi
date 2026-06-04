"use client";

// ZAAHI Vault — thin wrapper that fetches a VaultEntry and feeds it
// into the standard SidePanel via the `directData` / `renderFooter`
// hooks. The public listing card and the vault card are now the same
// component; only the bottom block (Pipeline / Owner contact /
// Broker notes / Activity / Share / Promote / Add to vault) is vault-
// specific and is injected through renderFooter.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.4, §6.5, §6.6.

import { useEffect, useMemo, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";
import { ConflictBanner } from "./ConflictBanner";
import { ConflictDetailModal } from "./ConflictDetailModal";
import { ShareModal } from "./ShareModal";
import { PromoteToPublicModal } from "./PromoteToPublicModal";
import { ImportFromShareButton } from "./ImportFromShareButton";
import { useEscapeClose } from "./useEscapeClose";
import SidePanel, { type ParcelDetail } from "./SidePanel";
// Phase 1 style unification (2026-05-31): loading + error states use
// the shared Panel container. The loaded state delegates to SidePanel
// which has already been migrated.
import { Panel } from "@/components/Panel";
import { PANEL_BORDER_COLOR, RADIUS_EDGE } from "@/lib/design-tokens";

// ── Brand tokens — unified against login reference (founder spec 2026-05-30).
const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_DIM = "rgba(255, 255, 255, 0.5)";

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
  ddaSnapshot: unknown | null;
  affectionPlan: AffectionPlanLite | null;
  addedBy: { id: string; nickname: string | null } | null;
  // Optional geometry / lat-lng if the underlying entry has them
  // (Path 1 DDA-resolved or manually placed). Used by SidePanel's PDF
  // generator + flyTo callers.
  geometry?: GeoJSON.Polygon | null;
  latitude?: number | null;
  longitude?: number | null;
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
  sharedBy?: { id: string; nickname: string | null };
  permission: string;
  shareId: string;
  ddaSnapshot: unknown | null;
  affectionPlan: AffectionPlanLite | null;
  geometry?: GeoJSON.Polygon | null;
  latitude?: number | null;
  longitude?: number | null;
}

type EntryView = OwnerView | RecipientView;

interface Props {
  entryId: string;
  mode: "owner" | "share";
  onClose: () => void;
  mapRef?: React.RefObject<MLMap | null>;
  /** Forwarded to SidePanel + applied to the local loading / error
   *  states. Founder spec 2026-05-31 Q1: vault loading/error widths
   *  match the saved width too, so opening a vault entry doesn't
   *  flicker from 350 to the user's saved value. */
  width?: number;
  onWidthChange?: (w: number) => void;
}

// ── EntryView → ParcelDetail adapter ──────────────────────────────
// SidePanel was written for the public /api/parcels/[id] response; vault
// entries get massaged into the same shape here so the public panel can
// render them as-is (Total Price → Asking Price, Affection Plan rows
// from view.affectionPlan, Feasibility Calculator + Site Plan PDF
// reused via directData).
function mapEntryToParcelDetail(view: EntryView): ParcelDetail {
  const plan = view.affectionPlan;
  return {
    id: view.id,
    plotNumber: view.plotNumber,
    district: view.district,
    emirate: view.emirate,
    status: "VAULT",
    area: view.area ?? 0,
    currentValuation: view.askingPriceFils ?? null,
    openToJV: false,
    jvDetails: null,
    latitude: view.latitude ?? null,
    longitude: view.longitude ?? null,
    geometry: view.geometry ?? null,
    affectionPlans: plan
      ? [{
          projectName: plan.projectName,
          community: plan.community,
          masterDeveloper: plan.masterDeveloper,
          oldNumber: null,
          plotAreaSqm: plan.plotAreaSqm,
          plotAreaSqft: plan.plotAreaSqft,
          maxGfaSqm: plan.maxGfaSqm,
          maxGfaSqft: plan.maxGfaSqft,
          maxHeightCode: plan.maxHeightCode,
          maxFloors: plan.maxFloors,
          maxHeightMeters: plan.maxHeightMeters,
          far: plan.far,
          // Cast through unknown — vault's setbacks/landUseMix come back
          // as `unknown` from the JSON response; SidePanel guards every
          // field with `?? null` before reading, so the structural cast
          // is safe at render time.
          setbacks: (plan.setbacks ?? null) as ParcelDetail["affectionPlans"][number]["setbacks"],
          landUseMix: (plan.landUseMix ?? null) as ParcelDetail["affectionPlans"][number]["landUseMix"],
          sitePlanIssue: plan.sitePlanIssue,
          sitePlanExpiry: plan.sitePlanExpiry,
          notes: plan.notes,
          notesOriginal: plan.notes,
          plotGuidelinesUrl: plan.plotGuidelinesUrl,
          source: "vault",
          fetchedAt: new Date().toISOString(),
          raw: null,
        }]
      : [],
  };
}

export function VaultSidePanelAdapter({ entryId, mode, onClose, mapRef, width, onWidthChange }: Props) {
  const [view, setView] = useState<EntryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  // Esc closes the panel — but only when no inner modal is open.
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
        if (!cancelled) setView(d);
      } catch (e) {
        console.error("[VaultSidePanelAdapter] fetch:", e);
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [entryId, mode]);

  // Memoise the SidePanel directData prop so the panel's useEffect
  // with deps [parcelId, directData] doesn't re-fire on every
  // page-level rerender. auto-rotate ticks 60fps via map.on("rotate")
  // → setBearing → page rerender; without the memo, a fresh object
  // reference here resets feasOpen / docsOpen / isFavorite / ddaPhase
  // on each frame and the Vault accordion sections can't stay open.
  //
  // Hook is declared at the top of the function BEFORE the loading /
  // error early returns below — Rules of Hooks. The previous attempt
  // (aefa842, reverted in 40f0d54) placed this hook after the early
  // returns and crashed prod with "Rendered more hooks than during
  // the previous render".
  //
  // view may be null during loading / error states (those paths
  // return their own Panel before this value is read); return null
  // there so the hook call is unconditional.
  //
  // See docs/research/autorotate-vault-diag.md for full cause chain.
  const directData = useMemo(
    () => (view ? mapEntryToParcelDetail(view) : null),
    [view],
  );

  // Founder spec 2026-05-31 Q1: loading/error transients inherit the
  // saved width so opening a vault entry doesn't snap from 350 →
  // saved when the loaded SidePanel takes over. Falls back to the
  // historical 350 px when the parent doesn't wire up width.
  const transientWidth = width ?? 350;

  if (loading && !view) {
    return (
      <Panel
        as="aside"
        radius={RADIUS_EDGE}
        noShadow
        style={{
          position: "fixed",
          right: 0, top: 0, bottom: 0,
          width: transientWidth,
          border: "none",
          borderLeft: `1px solid ${PANEL_BORDER_COLOR}`,
          color: TEXT_PRIMARY,
          padding: 16,
          fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
          zIndex: 30,
        }}
      >
        <div style={{ color: TEXT_DIM }}>Loading vault entry…</div>
      </Panel>
    );
  }

  if (error || !view) {
    return (
      <Panel
        as="aside"
        radius={RADIUS_EDGE}
        noShadow
        style={{
          position: "fixed",
          right: 0, top: 0, bottom: 0,
          width: transientWidth,
          border: "none",
          borderLeft: `1px solid ${PANEL_BORDER_COLOR}`,
          color: TEXT_PRIMARY,
          padding: 16,
          zIndex: 30,
        }}
      >
        <button onClick={onClose} style={{
          background: "transparent", border: "none", color: GOLD,
          fontSize: 18, cursor: "pointer", marginBottom: 12,
        }}>×</button>
        <div style={{ color: "#E63946", fontSize: 12 }}>{error ?? "No entry loaded"}</div>
      </Panel>
    );
  }

  // directData declared via useMemo above (guaranteed non-null here
  // because the loading/error early returns above filter view=null).
  const askingAed = view.askingPriceFils
    ? Number(BigInt(view.askingPriceFils) / BigInt(100))
    : null;

  return (
    <>
      <SidePanel
        parcelId={null}
        directData={directData}
        mapRef={mapRef}
        onClose={onClose}
        width={width}
        onWidthChange={onWidthChange}
        renderFooter={() => (
          <VaultFooter
            view={view}
            askingAed={askingAed}
            onShowConflict={() => setShowConflictModal(true)}
            onShare={() => setShowShareModal(true)}
            onPromote={() => setShowPromoteModal(true)}
          />
        )}
      />

      {showConflictModal && (
        <ConflictDetailModal
          emirate={view.emirate}
          district={view.district}
          plotNumber={view.plotNumber}
          onClose={() => setShowConflictModal(false)}
        />
      )}
      {showShareModal && view.access === "owner" && (
        <ShareModal
          entryId={view.id}
          entryLabel={`Plot ${view.plotNumber} — ${view.district}`}
          onClose={() => setShowShareModal(false)}
          onShared={() => setShowShareModal(false)}
        />
      )}
      {showPromoteModal && view.access === "owner" && (
        <PromoteToPublicModal
          entryId={view.id}
          entryLabel={`Plot ${view.plotNumber} — ${view.district}`}
          initialAskingAed={askingAed}
          onClose={() => setShowPromoteModal(false)}
          onPromoted={() => onClose()}
        />
      )}
    </>
  );
}

// ── Vault-specific footer rendered inside SidePanel ───────────────
function VaultFooter({
  view,
  askingAed,
  onShowConflict,
  onShare,
  onPromote,
}: {
  view: EntryView;
  askingAed: number | null;
  onShowConflict: () => void;
  onShare: () => void;
  onPromote: () => void;
}) {
  return (
    <div style={{
      padding: "0 14px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Access / promoted badge — replaces SidePanel's gold "Plot X"
          header context with vault-specific framing. */}
      <div style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(200, 169, 110, 0.08)",
        border: `1px solid rgba(200, 169, 110, 0.25)`,
        fontSize: 11,
        color: GOLD,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 700,
      }}>
        {view.access === "owner"
          ? "PRIVATE · only you"
          : view.access === "share" && view.sharedBy
            ? `SHARED BY @${view.sharedBy.nickname ?? "—"}`
            : "VAULT ENTRY"}
        {view.access === "owner" && view.promotedAt && (
          <div style={{ marginTop: 4, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>
            ✓ Promoted to public listing
          </div>
        )}
      </div>

      {view.conflictsWithOthers && (
        <ConflictBanner
          otherCount={countOthers(view)}
          onViewDetails={onShowConflict}
        />
      )}

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
          <div style={{ color: TEXT_PRIMARY, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {view.brokerNotes}
          </div>
        </Section>
      )}

      {view.access === "owner" && view.priceHistory.length > 0 && (
        <Section label={`Price history (${view.priceHistory.length})`}>
          {view.priceHistory.slice(0, 5).map((p) => {
            const aed = Number(BigInt(p.priceFils) / BigInt(100));
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 3 }}>
                <span style={{ color: TEXT_DIM }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                <span style={{ color: TEXT_PRIMARY }}>AED {aed.toLocaleString()}</span>
              </div>
            );
          })}
        </Section>
      )}

      {view.access === "owner" && view.shares.length > 0 && (
        <Section label={`Shared with ${view.shares.length}`}>
          {view.shares.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 3 }}>
              <span style={{ color: TEXT_DIM }}>@{s.recipient.nickname ?? "—"}</span>
              <span style={{ color: TEXT_PRIMARY }}>{s.permission}</span>
            </div>
          ))}
        </Section>
      )}

      {view.access === "owner" && view.activity.length > 0 && (
        <Section label="Activity">
          {view.activity.slice(0, 5).map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 3 }}>
              <span style={{ color: TEXT_DIM }}>{timeAgo(a.createdAt)}</span>
              <span style={{ color: TEXT_PRIMARY }}>{formatActivityKind(a.kind)}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Action buttons — owner gets Share + Promote; recipient (share
          mode) gets "Add to my vault" via ImportFromShareButton. */}
      {view.access === "owner" && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onShare}
            style={vaultBtnStyle}
          >
            Share
          </button>
          {!view.promotedAt && (
            <button
              type="button"
              onClick={onPromote}
              style={vaultBtnStyle}
            >
              Promote to public
            </button>
          )}
        </div>
      )}

      {view.access === "share" && (
        <ImportFromShareButton
          shareId={view.shareId}
          onImported={() => { /* parent re-fetches on next open */ }}
        />
      )}
    </div>
  );
}

const vaultBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid rgba(200, 169, 110, 0.4)`,
  background: "rgba(200, 169, 110, 0.10)",
  color: GOLD,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  fontFamily: "inherit",
};

// ── Helpers (kept local; pure formatting / counting) ────────────────
function countOthers(view: EntryView): number {
  if (view.access !== "owner") return 0;
  const cf = view.conflictedFields as Record<string, unknown> | null;
  if (!cf) return 0;
  let max = 0;
  for (const v of Object.values(cf)) {
    if (Array.isArray(v)) max = Math.max(max, v.length);
  }
  return max;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatActivityKind(kind: string): string {
  switch (kind) {
    case "CREATED": return "Entry created";
    case "PRICE_CHANGED": return "Price updated";
    case "STAGE_CHANGED": return "Stage updated";
    case "NOTE_ADDED": return "Notes updated";
    case "SHARED": return "Shared with another user";
    case "REVOKED": return "Share revoked";
    case "PROMOTED": return "Promoted to public listing";
    default: return kind;
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#FFFFFF",
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      fontSize: 12,
      marginTop: 3,
    }}>
      <span style={{ color: TEXT_DIM }}>{label}</span>
      <span style={{ color: TEXT_PRIMARY, textAlign: "right" }}>{children}</span>
    </div>
  );
}
