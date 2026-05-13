"use client";

// ZAAHI Vault — informational banner shown at top of side-panel when
// the entry is in conflict with other users' vault entries on the same
// plot.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.7, §15.
//
// Info-only. No DISPUTED status, no admin arbitration in MVP. Brokers
// see the @nicknames and reach out to each other themselves.

const GOLD = "#C8A96E";

interface Props {
  /** Number of OTHER entries (excluding the caller's own). */
  otherCount: number;
  onViewDetails: () => void;
}

export function ConflictBanner({ otherCount, onViewDetails }: Props) {
  if (otherCount < 1) return null;
  return (
    <div
      style={{
        background: "rgba(230, 126, 34, 0.12)",
        border: "1px solid rgba(230, 126, 34, 0.4)",
        borderRadius: 10,
        padding: "10px 14px",
        margin: "12px 14px 0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
        color: "rgba(255,255,255,0.88)",
      }}
    >
      <span style={{ fontSize: 14, color: "#E67E22" }}>⚠</span>
      <div style={{ flex: 1, lineHeight: 1.4 }}>
        <strong style={{ color: "#E67E22" }}>
          {otherCount} other user{otherCount === 1 ? "" : "s"}
        </strong>{" "}
        also have this plot in their vaults with different data.
      </div>
      <button
        onClick={onViewDetails}
        style={{
          background: "rgba(200, 169, 110, 0.15)",
          border: `1px solid ${GOLD}`,
          color: GOLD,
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 150ms ease, border-color 150ms ease",
        }}
      >
        View
      </button>
    </div>
  );
}
