"use client";

// One row per parcel needing OWNER verification (spec §7.5). A parcel
// may have multiple PENDING OWNER claims — surfaced as a "n claims"
// pill on the row; clicking opens the detail modal where the admin
// picks which claim to verify.

import { GOLD, TEXT, TEXT_DIM, TEXT_FADE } from "./styles";
import type { TitleDeedListItem } from "./types";

export function TitleDeedList({
  items,
  loading,
  onOpen,
}: {
  items: TitleDeedListItem[];
  loading: boolean;
  onOpen: (parcelId: string) => void;
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
        No Title Deed claims awaiting verification.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <Row key={it.parcelId} item={it} onOpen={() => onOpen(it.parcelId)} />
      ))}
    </div>
  );
}

function Row({ item, onOpen }: { item: TitleDeedListItem; onOpen: () => void }) {
  const claimNicknames = item.claims
    .map((c) => c.nickname ?? c.userId.slice(0, 8))
    .join(", ");
  const oldestClaim = item.claims[0];
  const date = oldestClaim
    ? new Date(oldestClaim.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
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
        Plot {item.plotNumber}
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
        OWNER
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
        {item.projectName} · claims by {claimNicknames}
      </span>
      <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>{date}</span>
      {item.claims.length > 1 && (
        <span
          style={{
            fontSize: 10,
            color: GOLD,
            border: "1px solid rgba(200,169,110,0.4)",
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            fontWeight: 700,
          }}
        >
          {item.claims.length} CLAIMS
        </span>
      )}
    </button>
  );
}
