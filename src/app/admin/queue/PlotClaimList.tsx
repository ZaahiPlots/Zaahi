"use client";

// Row per non-OWNER PENDING PlotClaim (BROKER / DEVELOPER / ARCHITECT
// / POA). OWNER PENDING claims show in the Title Deed tab instead.

import { GOLD, TEXT, TEXT_DIM, TEXT_FADE } from "./styles";
import type { PlotClaimListItem } from "./types";

const ROLE_LABEL: Record<PlotClaimListItem["roleAtClaim"], string> = {
  BROKER: "Broker",
  DEVELOPER: "Developer",
  ARCHITECT: "Architect",
  POA: "POA",
};

export function PlotClaimList({
  items,
  loading,
  onOpen,
}: {
  items: PlotClaimListItem[];
  loading: boolean;
  onOpen: (claimId: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: "24px 0", color: TEXT_DIM, fontSize: 12, textAlign: "center" }}>
        Loading…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div style={{ padding: "32px 0", color: TEXT_DIM, fontSize: 12, textAlign: "center" }}>
        No role claims awaiting verification.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <Row key={it.id} item={it} onOpen={() => onOpen(it.id)} />
      ))}
    </div>
  );
}

function Row({ item, onOpen }: { item: PlotClaimListItem; onOpen: () => void }) {
  const roleLabel = ROLE_LABEL[item.roleAtClaim] ?? item.roleAtClaim;
  const date = new Date(item.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const priceAed = (Number(item.priceAed) / 100).toLocaleString("en-US");
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        color: TEXT,
        fontFamily: "inherit",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      <span style={{ fontWeight: 700, color: GOLD, fontSize: 13 }}>
        {item.user.nickname ?? item.userId.slice(0, 8)}
      </span>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          padding: "2px 6px",
          background: "rgba(200,169,110,0.10)",
          color: GOLD,
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: 4,
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {roleLabel}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 11,
          color: TEXT_FADE,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        Plot {item.parcel.plotNumber} · {item.parcel.district}
      </span>
      <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>AED {priceAed}</span>
      <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>{date}</span>
    </button>
  );
}
