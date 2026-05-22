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
              {view ? `${view.plotNumber} · ${view.district}` : "Loading…"}
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
            <Section label="Plot">
              <Row label="Emirate">{view.emirate}</Row>
              <Row label="District">{view.district}</Row>
              <Row label="Plot number">{view.plotNumber}</Row>
              {view.area !== null && <Row label="Area">{view.area.toLocaleString()} sqft</Row>}
              {view.landUse && <Row label="Land use">{view.landUse}</Row>}
            </Section>

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
