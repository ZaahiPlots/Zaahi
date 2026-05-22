"use client";

// ZAAHI Vault — single row in the /vault list table.
//
// Composes PriceEditCell + AttributionBadge + PriceHistoryDropdown.
// Renders the "All entries" rows; share-recipient rows live in
// a separate variant below.

import { useState } from "react";
import { AttributionBadge } from "./AttributionBadge";
import { PriceEditCell } from "./PriceEditCell";
import { PriceHistoryDropdown } from "./PriceHistoryDropdown";
import { VAULT_STAGE_LABELS, type VaultEntrySummary, type VaultEntryShareSummary } from "./types";

const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";
const TEAL = "#1B4965";

interface OwnedProps {
  variant: "owned";
  entry: VaultEntrySummary;
  selfUserId: string;
  onPriceSaved: (id: string, newPriceFils: string | null) => void;
}

interface SharedProps {
  variant: "shared";
  share: VaultEntryShareSummary;
}

type Props = OwnedProps | SharedProps;

export function VaultListItem(props: Props) {
  const [expanded, setExpanded] = useState(false);

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
          <div>
            <AttributionBadge
              addedByUserId={e.addedByUserId}
              addedByNickname={e.addedByNickname}
              selfUserId={props.selfUserId}
            />
            {e.conflictsWithOthers && (
              <span style={conflictIndicatorStyle}>⚠ Conflict</span>
            )}
          </div>
        </div>
        {expanded && <PriceHistoryDropdown entryId={e.id} />}
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
