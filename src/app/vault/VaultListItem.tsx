"use client";

// ZAAHI Vault — single row in the /vault list table.
//
// Composes PriceEditCell + AttributionBadge + PriceHistoryDropdown.
// Renders the "All entries" rows; share-recipient rows live in
// a separate variant below.

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { AttributionBadge } from "./AttributionBadge";
import { PriceEditCell } from "./PriceEditCell";
import { PriceHistoryDropdown } from "./PriceHistoryDropdown";
import { VAULT_STAGE_LABELS, type VaultEntrySummary, type VaultEntryShareSummary } from "./types";

const GOLD = "#C8A96E";
const RED = "#E63946";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";
const TEAL = "#1B4965";

interface OwnedProps {
  variant: "owned";
  entry: VaultEntrySummary;
  selfUserId: string;
  onPriceSaved: (id: string, newPriceFils: string | null) => void;
  /** Called after the row's entry is deleted server-side (HTTP 204) so
   *  the parent can refresh the list. */
  onDeleted: (entryId: string) => void;
}

interface SharedProps {
  variant: "shared";
  share: VaultEntryShareSummary;
}

type Props = OwnedProps | SharedProps;

export function VaultListItem(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (props.variant === "owned") {
    const e = props.entry;
    return (
      <>
        <div style={rowStyle}>
          <div style={plotCellStyle}>
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Hide price history" : "Show price history"}
              style={chevronStyle}
            >
              {expanded ? "▾" : "▸"}
            </button>
            <div>
              <div style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>{e.plotNumber}</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>{e.district}</div>
            </div>
          </div>
          <div>
            <span style={stagePillStyle(e.stage)}>{VAULT_STAGE_LABELS[e.stage]}</span>
          </div>
          <div>
            <PriceEditCell
              entryId={e.id}
              askingPriceFils={e.askingPriceFils}
              onSaved={(p) => props.onPriceSaved(e.id, p)}
            />
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 12 }}>
            {e.nextFollowUpAt ? new Date(e.nextFollowUpAt).toLocaleDateString() : "—"}
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 12 }}>
            {e.shareCount > 0 ? `${e.shareCount} share${e.shareCount === 1 ? "" : "s"}` : "—"}
          </div>
          <div style={attributionCellStyle}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <AttributionBadge
                addedByUserId={e.addedByUserId}
                addedByNickname={e.addedByNickname}
                selfUserId={props.selfUserId}
              />
              {e.conflictsWithOthers && (
                <span style={conflictIndicatorStyle}>⚠ Conflict</span>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete this entry"
              aria-label="Delete this entry"
              style={deleteIconButtonStyle}
              onMouseEnter={(ev) => {
                ev.currentTarget.style.borderColor = RED;
                ev.currentTarget.style.background = "rgba(230, 57, 70, 0.18)";
                ev.currentTarget.style.color = RED;
              }}
              onMouseLeave={(ev) => {
                ev.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                ev.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                ev.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
              }}
            >
              {/* Trash-can icon — minimalist SVG per CLAUDE.md (no emoji). */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
        {expanded && <PriceHistoryDropdown entryId={e.id} />}
        {showDeleteConfirm && (
          <DeleteConfirmModal
            entry={e}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirmed={() => {
              setShowDeleteConfirm(false);
              props.onDeleted(e.id);
            }}
          />
        )}
      </>
    );
  }

  // shared variant
  const s = props.share;
  const e = s.entry;
  const aed = e.askingPriceFils ? Number(BigInt(e.askingPriceFils) / BigInt(100)) : null;
  return (
    <div style={rowStyle}>
      <div style={plotCellStyle}>
        <div style={{ width: 18 }} />
        <div>
          <div style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>{e.plotNumber}</div>
          <div style={{ color: TEXT_DIM, fontSize: 11 }}>{e.district}</div>
        </div>
      </div>
      <div>
        <span style={stagePillStyle(e.stage)}>{VAULT_STAGE_LABELS[e.stage]}</span>
      </div>
      <div style={{ color: TEXT_PRIMARY, fontSize: 13 }}>
        {aed !== null ? `AED ${aed.toLocaleString()}` : "—"}
      </div>
      <div style={{ color: TEXT_DIM, fontSize: 12 }}>—</div>
      <div style={{ color: TEXT_DIM, fontSize: 12 }}>{s.permission}</div>
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            fontSize: 10,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            borderRadius: 4,
            background: "rgba(27, 73, 101, 0.18)",
            color: TEAL,
            border: `1px solid rgba(27, 73, 101, 0.4)`,
            whiteSpace: "nowrap",
          }}
        >
          From @{s.sharedBy?.nickname ?? "—"}
        </span>
        {e.conflictsWithOthers && <span style={conflictIndicatorStyle}>⚠ Conflict</span>}
      </div>
    </div>
  );
}

function stagePillStyle(stage: string): React.CSSProperties {
  const color = {
    LEAD: "#1B4965",
    CONTACTED: "#E67E22",
    NEGOTIATING: "#C8A96E",
    AGREEMENT_SIGNED: "#2D6A4F",
    PROMOTED: "#9B2226",
    LOST: "#6B7280",
    CLOSED: "#1A1A2E",
  }[stage] ?? "#888";
  return {
    display: "inline-block",
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: 4,
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    whiteSpace: "nowrap",
  };
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr 0.8fr 1.4fr",
  gap: 14,
  alignItems: "center",
  padding: "12px 18px",
  borderBottom: `1px solid ${BORDER}`,
};

const plotCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const chevronStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: GOLD,
  fontSize: 12,
  cursor: "pointer",
  width: 18,
  textAlign: "center",
};

const conflictIndicatorStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 6,
  padding: "1px 6px",
  fontSize: 10,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderRadius: 3,
  background: "rgba(230, 126, 34, 0.15)",
  color: "#E67E22",
  border: "1px solid rgba(230, 126, 34, 0.4)",
};

const attributionCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const deleteIconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: "rgba(255, 255, 255, 0.04)",
  color: TEXT_DIM,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
  transition: "border-color 150ms ease, background 150ms ease, color 150ms ease",
};

// ── DeleteConfirmModal ──
//
// Glassmorphism navy panel + red destructive accent per CLAUDE.md
// UI STYLE GUIDE. Submits DELETE /api/me/vault/entries/[id] on Confirm;
// surfaces server error inline if non-204. Backdrop + Esc + Cancel
// all dismiss without calling DELETE.

function DeleteConfirmModal({
  entry,
  onClose,
  onConfirmed,
}: {
  entry: VaultEntrySummary;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiFetch(`/api/me/vault/entries/${entry.id}`, { method: "DELETE" });
      if (r.status === 204) {
        onConfirmed();
        return;
      }
      const body = await r.json().catch(() => ({}));
      setError(`Delete failed (${r.status}) — ${body.error ?? "unknown error"}`);
    } catch (e) {
      console.error("[vault-delete] failed:", e);
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div onClick={onClose} style={confirmBackdropStyle}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={confirmPanelStyle}
        role="alertdialog"
        aria-modal="true"
        aria-label={`Delete vault entry ${entry.plotNumber}`}
      >
        <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: RED, marginBottom: 12 }}>
          Delete this vault entry?
        </div>
        <div style={{ fontSize: 13, color: TEXT_PRIMARY, lineHeight: 1.55, marginBottom: 8 }}>
          Plot <strong>{entry.plotNumber}</strong> · {entry.district}
        </div>
        <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5, marginBottom: 18 }}>
          Removes the entry, its activity log, price history, and any shares.
          Any recipients you shared with will lose access. <strong style={{ color: RED }}>This cannot be undone.</strong>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: RED, marginBottom: 12, padding: 8, background: "rgba(230, 57, 70, 0.08)", border: `1px solid rgba(230, 57, 70, 0.3)`, borderRadius: 6 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={submitting} style={confirmCancelButtonStyle}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting} style={confirmDeleteButtonStyle}>
            {submitting ? "Deleting…" : "Delete entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

const confirmBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
  padding: 20,
};

const confirmPanelStyle: React.CSSProperties = {
  background: "rgba(10, 22, 40, 0.95)",
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid rgba(230, 57, 70, 0.45)`,
  borderRadius: 12,
  padding: 22,
  maxWidth: 420,
  width: "100%",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
};

const confirmCancelButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const confirmDeleteButtonStyle: React.CSSProperties = {
  background: RED,
  border: `1px solid ${RED}`,
  color: "#fff",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
